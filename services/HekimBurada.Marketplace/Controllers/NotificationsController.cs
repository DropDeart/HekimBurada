using BaseForge.API.Controllers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Marketplace.Authorization;
using Marketplace.Features.Notifications;

namespace Marketplace.Controllers;

/// <summary>Bildirim uçları — CodeGen dışı, elle eklendi. Çağıran her zaman kendi bildirimlerini görür,
/// başka bir kullanıcının bildirimine erişim yok.</summary>
[Authorize]
[Route("api/notifications")]
public sealed class NotificationsController : BaseController
{
    /// <summary>Çağıranın bildirimlerini en yeniden eskiye listeler.</summary>
    [HttpGet]
    public async Task<ActionResult<List<NotificationDto>>> List(CancellationToken cancellationToken)
    {
        var callerId = AdminAuth.GetUserId(User);
        if (callerId is null)
        {
            return Forbid();
        }

        var result = await Mediator.Send(new ListMyNotificationsQuery { RecipientUserId = callerId.Value }, cancellationToken);
        return Ok(result);
    }

    /// <summary>Çağıranın tüm bildirimlerini okunmuş işaretler.</summary>
    [HttpPost("mark-all-read")]
    public async Task<IActionResult> MarkAllRead(CancellationToken cancellationToken)
    {
        var callerId = AdminAuth.GetUserId(User);
        if (callerId is null)
        {
            return Forbid();
        }

        await Mediator.Send(new MarkAllNotificationsReadCommand { RecipientUserId = callerId.Value }, cancellationToken);
        return NoContent();
    }
}
