using System.Security.Claims;
using Messaging.Presence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Messaging.Hubs;

/// <summary>
/// Uygulama genelinde (sadece sohbet ekranında değil, her sayfada) bağlı kalınan hub — kullanıcının
/// "çevrimiçi" sayılmasını sağlar ve PresenceGrpcService'in anlık bildirim push'ları için hedef
/// olur (bkz. proje kararı: teklif/mesaj bildirimlerinde SignalR mi e-posta mı gönderileceğine
/// bu bağlantının varlığına göre karar verilir). CodeGen dışı, elle eklendi.
/// </summary>
[Authorize]
public sealed class PresenceHub : Hub
{
    private readonly IPresenceTracker _tracker;

    public PresenceHub(IPresenceTracker tracker)
    {
        _tracker = tracker;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();
        if (userId is not null)
        {
            await _tracker.ConnectAsync(userId.Value);
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetUserId();
        if (userId is not null)
        {
            await _tracker.DisconnectAsync(userId.Value);
        }

        await base.OnDisconnectedAsync(exception);
    }

    private Guid? GetUserId()
    {
        var raw = Context.User?.FindFirst("sub")?.Value ?? Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(raw, out var id) ? id : null;
    }
}
