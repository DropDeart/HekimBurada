using BaseForge.API.Controllers;
using BaseForge.Core.CQRS;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Messaging.Authorization;
using Messaging.Features.Messages;

namespace Messaging.Controllers;

/// <summary>Message CRUD uçları.</summary>
[Authorize]
[Route("api/[controller]")]
public sealed class MessagesController : BaseController
{
    /// <summary>Kimliğe göre tek bir Message getirir.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<MessageDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetMessageByIdQuery { Id = id }, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    /// <summary>Message kayıtlarını sayfalı listeler (query string: page, pageSize, sortBy, search).</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<MessageDto>>> List([FromQuery] ListMessageQuery query, CancellationToken cancellationToken)
        => Ok(await Mediator.Send(query, cancellationToken));

    /// <summary>Yeni bir Message oluşturur.</summary>
    [HttpPost]
    public async Task<ActionResult<Guid>> Create(CreateMessageCommand command, CancellationToken cancellationToken)
    {
        var id = await Mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id }, id);
    }

    /// <summary>Var olan bir Message kaydını günceller — CodeGen dışı: sahiplik şartı elle eklendi
    /// (aynı gerekçeyle, bkz. Delete doc yorumu).</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateMessageCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        var message = await Mediator.Send(new GetMessageByIdQuery { Id = id }, cancellationToken);
        if (message is null)
        {
            return NotFound();
        }

        var callerId = AdminAuth.GetUserId(User);
        if (callerId is null || message.SenderId != callerId)
        {
            return Forbid();
        }

        command.Id = id;
        await Mediator.Send(command, cancellationToken);
        return NoContent();
    }

    /// <summary>Bir Message kaydını siler — CodeGen dışı: sahiplik şartı elle eklendi (önceden hiç
    /// yoktu, herhangi bir giriş yapmış kullanıcı başkasının mesajını silebiliyordu). Messaging
    /// servisinde staff-admin kavramı yok (bkz. AdminAuth), yalnızca gönderen silebilir.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var message = await Mediator.Send(new GetMessageByIdQuery { Id = id }, cancellationToken);
        if (message is null)
        {
            return NotFound();
        }

        var callerId = AdminAuth.GetUserId(User);
        if (callerId is null || message.SenderId != callerId)
        {
            return Forbid();
        }

        await Mediator.Send(new DeleteMessageCommand { Id = id }, cancellationToken);
        return NoContent();
    }

    /// <summary>Çağıranın bir Offer sohbetinde karşı taraftan gelen okunmamış mesajlarını okundu
    /// işaretler — CodeGen dışı, elle eklendi.</summary>
    [HttpPost("mark-read")]
    public async Task<IActionResult> MarkRead([FromBody] MarkReadRequest request, CancellationToken cancellationToken)
    {
        var readerId = AdminAuth.GetUserId(User);
        if (readerId is null)
        {
            return Forbid();
        }

        await Mediator.Send(new MarkMessagesReadCommand { OfferId = request.OfferId, ReaderId = readerId.Value }, cancellationToken);
        return NoContent();
    }
}

public sealed record MarkReadRequest(Guid OfferId);
