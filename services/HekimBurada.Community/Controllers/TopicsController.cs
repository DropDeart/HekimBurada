using BaseForge.API.Controllers;
using BaseForge.Core.CQRS;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Community.Authorization;
using Community.Features.Topics;

namespace Community.Controllers;

/// <summary>Topic CRUD uçları.</summary>
[Authorize]
[Route("api/[controller]")]
public sealed class TopicsController : BaseController
{
    /// <summary>Kimliğe göre tek bir Topic getirir.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TopicDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetTopicByIdQuery { Id = id }, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    /// <summary>Topic kayıtlarını sayfalı listeler (query string: page, pageSize, sortBy, search).</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<TopicDto>>> List([FromQuery] ListTopicQuery query, CancellationToken cancellationToken)
        => Ok(await Mediator.Send(query, cancellationToken));

    /// <summary>Yeni bir Topic oluşturur — CodeGen dışı: AuthorId sahtekarlığını önlemek için
    /// çağıranın kendi kimliğiyle elle ezildi (client-supplied değerine güvenilmiyor).</summary>
    [HttpPost]
    public async Task<ActionResult<Guid>> Create(CreateTopicCommand command, CancellationToken cancellationToken)
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

    /// <summary>Var olan bir Topic kaydını günceller — CodeGen dışı: sahip/admin şartı elle eklendi.
    /// Update komutu tüm alanları eziyor; admin olmayan çağıran AuthorId'yi başkasına devredemesin diye
    /// alan orijinal değerine sabitleniyor.</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateTopicCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        var isAdmin = AdminAuth.IsStaffAdmin(User);
        if (!isAdmin)
        {
            var topic = await Mediator.Send(new GetTopicByIdQuery { Id = id }, cancellationToken);
            if (topic is not null)
            {
                var callerId = AdminAuth.GetUserId(User);
                if (callerId is null || topic.AuthorId != callerId)
                {
                    return Forbid();
                }

                command.AuthorId = topic.AuthorId;
            }
        }

        command.Id = id;
        await Mediator.Send(command, cancellationToken);
        return NoContent();
    }

    /// <summary>Bir Topic kaydını siler — CodeGen dışı: sahip/admin şartı elle eklendi.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (await IsOwnerOrAdminAsync(id, cancellationToken) == false)
        {
            return Forbid();
        }

        await Mediator.Send(new DeleteTopicCommand { Id = id }, cancellationToken);
        return NoContent();
    }

    /// <summary>Çağıran, konunun yazarı mı (AuthorId) yoksa Admin/SuperAdmin mi? — CodeGen dışı, elle
    /// eklendi. Konu yoksa null döner (asıl komut kendi NotFoundException'ını fırlatsın).</summary>
    private async Task<bool?> IsOwnerOrAdminAsync(Guid topicId, CancellationToken cancellationToken)
    {
        if (AdminAuth.IsStaffAdmin(User))
        {
            return true;
        }

        var topic = await Mediator.Send(new GetTopicByIdQuery { Id = topicId }, cancellationToken);
        if (topic is null)
        {
            return null;
        }

        var callerId = AdminAuth.GetUserId(User);
        return callerId is not null && topic.AuthorId == callerId;
    }

    /// <summary>ViewCount sayacını bir artırır (herkese açık).</summary>
    [AllowAnonymous]
    [HttpPost("{id:guid}/increment-viewcount")]
    public async Task<IActionResult> IncrementViewCount(Guid id, CancellationToken cancellationToken)
    {
        await Mediator.Send(new IncrementTopicViewCountCommand { Id = id }, cancellationToken);
        return NoContent();
    }
}
