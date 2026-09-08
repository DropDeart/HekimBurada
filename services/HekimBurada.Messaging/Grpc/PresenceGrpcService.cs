using Grpc.Core;
using Messaging.Hubs;
using Messaging.Presence;
using Microsoft.AspNetCore.SignalR;

namespace Messaging.Grpc;

/// <summary>
/// Diğer servislerin (Marketplace/Community) teklif/yorum gibi olaylarda çağırdığı bildirim ucu —
/// kullanıcı çevrimiçiyse PresenceHub üzerinden anlık push yapar, DeliveredLive'ı buna göre döner
/// (çağıran, false dönerse kendi e-posta gönderimini tetikler). CodeGen dışı, elle eklendi.
/// </summary>
public sealed class PresenceGrpcService : PresenceService.PresenceServiceBase
{
    private readonly IPresenceTracker _tracker;
    private readonly IHubContext<PresenceHub> _hub;

    public PresenceGrpcService(IPresenceTracker tracker, IHubContext<PresenceHub> hub)
    {
        _tracker = tracker;
        _hub = hub;
    }

    public override async Task<NotifyResponse> Notify(NotifyRequest request, ServerCallContext context)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (!Guid.TryParse(request.UserId, out var userId))
        {
            throw new RpcException(new Status(StatusCode.InvalidArgument, "Geçersiz user_id."));
        }

        var online = await _tracker.IsOnlineAsync(userId);
        if (online)
        {
            await _hub.Clients.User(userId.ToString()).SendAsync(
                "notificationReceived",
                new { title = request.Title, body = request.Body, linkPath = request.LinkPath },
                context.CancellationToken);
        }

        return new NotifyResponse { DeliveredLive = online };
    }
}
