using BaseForge.API.Controllers;
using BaseForge.Core.CQRS;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Gateway.Authorization;
using Gateway.Features.ContactMessages;

namespace Gateway.Controllers;

/// <summary>ContactMessage uçları. Oluşturma (Create) herkese açık — anonim ziyaretçi de iletişim
/// formunu gönderebilir. Okuma/durum güncelleme/silme yalnızca Admin/SuperAdmin'e açık (destek
/// talepleri başkasının görebileceği bir içerik değil). CodeGen dışı elle eklendi.</summary>
[Authorize]
[Route("api/[controller]")]
public sealed class ContactMessagesController : BaseController
{
    /// <summary>Yeni bir ContactMessage oluşturur — iletişim formundan, giriş gerektirmez.</summary>
    [AllowAnonymous]
    [HttpPost]
    public async Task<ActionResult<Guid>> Create(CreateContactMessageCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        var id = await Mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id }, id);
    }

    /// <summary>Kimliğe göre tek bir ContactMessage getirir — yalnızca Admin/SuperAdmin.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ContactMessageDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        if (!AdminAuth.IsStaffAdmin(User))
        {
            return Forbid();
        }

        var result = await Mediator.Send(new GetContactMessageByIdQuery { Id = id }, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    /// <summary>ContactMessage kayıtlarını sayfalı listeler — yalnızca Admin/SuperAdmin
    /// (query string: page, pageSize, sortBy, search, status).</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<ContactMessageDto>>> List([FromQuery] ListContactMessageQuery query, CancellationToken cancellationToken)
    {
        if (!AdminAuth.IsStaffAdmin(User))
        {
            return Forbid();
        }

        return Ok(await Mediator.Send(query, cancellationToken));
    }

    /// <summary>Bir ContactMessage'ın durumunu günceller — yalnızca Admin/SuperAdmin.</summary>
    [HttpPut("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, UpdateContactMessageStatusCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        if (!AdminAuth.IsStaffAdmin(User))
        {
            return Forbid();
        }

        command.Id = id;
        await Mediator.Send(command, cancellationToken);
        return NoContent();
    }

    /// <summary>Bir ContactMessage kaydını siler — yalnızca Admin/SuperAdmin.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (!AdminAuth.IsStaffAdmin(User))
        {
            return Forbid();
        }

        await Mediator.Send(new DeleteContactMessageCommand { Id = id }, cancellationToken);
        return NoContent();
    }
}
