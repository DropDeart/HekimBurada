using BaseForge.API.Controllers;
using BaseForge.Core.CQRS;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Community.Authorization;
using Community.Features.Likes;

namespace Community.Controllers;

/// <summary>Like CRUD uçları.</summary>
[Authorize]
[Route("api/[controller]")]
public sealed class LikesController : BaseController
{
    /// <summary>Kimliğe göre tek bir Like getirir.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<LikeDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetLikeByIdQuery { Id = id }, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    /// <summary>Like kayıtlarını sayfalı listeler (query string: page, pageSize, sortBy, search).</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<LikeDto>>> List([FromQuery] ListLikeQuery query, CancellationToken cancellationToken)
        => Ok(await Mediator.Send(query, cancellationToken));

    /// <summary>Yeni bir Like oluşturur — CodeGen dışı: AuthorId sahtekarlığını önlemek için
    /// çağıranın kendi kimliğiyle elle ezildi (client-supplied değerine güvenilmiyor). TopicId/CommentId'den
    /// tam biri set edilmeli (bkz. CreateLikeHandler.EnsureExactlyOneTarget).</summary>
    [HttpPost]
    public async Task<ActionResult<Guid>> Create(CreateLikeCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        var callerId = AdminAuth.GetUserId(User);
        if (callerId is null)
        {
            return Forbid();
        }

        command.AuthorId = callerId.Value;
        var id = await Mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id }, id);
    }

    /// <summary>Var olan bir Like kaydını günceller — CodeGen dışı: sahip/admin şartı elle eklendi.
    /// Update komutu tüm alanları eziyor; admin olmayan çağıran AuthorId'yi başkasına devredemesin diye
    /// alan orijinal değerine sabitleniyor.</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateLikeCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        var isAdmin = AdminAuth.IsStaffAdmin(User);
        if (!isAdmin)
        {
            var like = await Mediator.Send(new GetLikeByIdQuery { Id = id }, cancellationToken);
            if (like is not null)
            {
                var callerId = AdminAuth.GetUserId(User);
                if (callerId is null || like.AuthorId != callerId)
                {
                    return Forbid();
                }

                command.AuthorId = like.AuthorId;
            }
        }

        command.Id = id;
        await Mediator.Send(command, cancellationToken);
        return NoContent();
    }

    /// <summary>Bir Like kaydını siler — CodeGen dışı: sahip/admin şartı elle eklendi.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (await IsOwnerOrAdminAsync(id, cancellationToken) == false)
        {
            return Forbid();
        }

        await Mediator.Send(new DeleteLikeCommand { Id = id }, cancellationToken);
        return NoContent();
    }

    /// <summary>Çağıran, beğeninin sahibi mi (AuthorId) yoksa Admin/SuperAdmin mi? — CodeGen dışı, elle
    /// eklendi. Kayıt yoksa null döner (asıl komut kendi NotFoundException'ını fırlatsın).</summary>
    private async Task<bool?> IsOwnerOrAdminAsync(Guid likeId, CancellationToken cancellationToken)
    {
        if (AdminAuth.IsStaffAdmin(User))
        {
            return true;
        }

        var like = await Mediator.Send(new GetLikeByIdQuery { Id = likeId }, cancellationToken);
        if (like is null)
        {
            return null;
        }

        var callerId = AdminAuth.GetUserId(User);
        return callerId is not null && like.AuthorId == callerId;
    }
}
