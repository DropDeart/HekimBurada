using Messaging.Presence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Messaging.Controllers;

/// <summary>
/// Bir kullanıcının çevrimiçi olup olmadığını sorgular — mesajlaşma ekranında karşı tarafın yanında
/// "Çevrimiçi" göstergesi için. Herhangi bir giriş yapmış kullanıcıya açık, admin gerektirmez.
/// gRPC PresenceService.Notify zaten dahili olarak bu kontrolü yapıyor ama sadece push amaçlı;
/// bu uç düz bir sorgu için (bkz. proje kararı). CodeGen dışı, elle eklendi.
/// </summary>
[Authorize]
[Route("api/presence")]
public sealed class PresenceController : ControllerBase
{
    private readonly IPresenceTracker _tracker;

    public PresenceController(IPresenceTracker tracker)
    {
        _tracker = tracker;
    }

    [HttpGet("{userId:guid}")]
    public async Task<IActionResult> IsOnline(Guid userId, CancellationToken cancellationToken)
    {
        var online = await _tracker.IsOnlineAsync(userId);
        return Ok(new PresenceStatusResponse(online));
    }
}

public sealed record PresenceStatusResponse(bool Online);
