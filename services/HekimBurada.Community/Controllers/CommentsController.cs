using BaseForge.API.Controllers;
using BaseForge.Core.CQRS;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Community.Authorization;
using Community.Features.Comments;

namespace Community.Controllers;

/// <summary>Comment CRUD uçları.</summary>
[Authorize]
[Route("api/[controller]")]
public sealed class CommentsController : BaseController
{
    /// <summary>Kimliğe göre tek bir Comment getirir.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CommentDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetCommentByIdQuery { Id = id }, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    /// <summary>Comment kayıtlarını sayfalı listeler (query string: page, pageSize, sortBy, search).</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<CommentDto>>> List([FromQuery] ListCommentQuery query, CancellationToken cancellationToken)
        => Ok(await Mediator.Send(query, cancellationToken));

    /// <summary>Yeni bir Comment oluşturur — CodeGen dışı: AuthorId sahtekarlığını önlemek için
    /// çağıranın kendi kimliğiyle elle ezildi (client-supplied değerine güvenilmiyor). ParentId
    /// verilmişse bu bir yanıttır (tek seviye iç içelik).</summary>
    [HttpPost]
    public async Task<ActionResult<Guid>> Create(CreateCommentCommand command, CancellationToken cancellationToken)
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

    /// <summary>Var olan bir Comment kaydını günceller — CodeGen dışı: sahip/admin şartı elle eklendi.
    /// Update komutu tüm alanları eziyor; admin olmayan çağıran AuthorId'yi başkasına devredemesin diye
    /// alan orijinal değerine sabitleniyor.</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateCommentCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        var isAdmin = AdminAuth.IsStaffAdmin(User);
        if (!isAdmin)
        {
            var comment = await Mediator.Send(new GetCommentByIdQuery { Id = id }, cancellationToken);
            if (comment is not null)
            {
                var callerId = AdminAuth.GetUserId(User);
                if (callerId is null || comment.AuthorId != callerId)
                {
                    return Forbid();
                }

                command.AuthorId = comment.AuthorId;
            }
        }

        command.Id = id;
        await Mediator.Send(command, cancellationToken);
        return NoContent();
    }

    /// <summary>Bir Comment kaydını siler — CodeGen dışı: sahip/admin şartı elle eklendi (admin panelinin
    /// Yorum Moderasyonu ekranı da bu uca gidiyor).</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (await IsOwnerOrAdminAsync(id, cancellationToken) == false)
        {
            return Forbid();
        }

        await Mediator.Send(new DeleteCommentCommand { Id = id }, cancellationToken);
        return NoContent();
    }

    /// <summary>
    /// Çağıran, yorumun yazarı mı (AuthorId) yoksa Admin/SuperAdmin mi? — CodeGen dışı, elle eklendi.
    /// Yorum yoksa null döner (asıl komut kendi NotFoundException'ını fırlatsın diye 404 burada taklit
    /// edilmiyor).
    /// </summary>
    private async Task<bool?> IsOwnerOrAdminAsync(Guid commentId, CancellationToken cancellationToken)
    {
        if (AdminAuth.IsStaffAdmin(User))
        {
            return true;
        }

        var comment = await Mediator.Send(new GetCommentByIdQuery { Id = commentId }, cancellationToken);
        if (comment is null)
        {
            return null;
        }

        var callerId = AdminAuth.GetUserId(User);
        return callerId is not null && comment.AuthorId == callerId;
    }
}
