using Grpc.Core;
using Messaging.Grpc;

namespace Marketplace.Integration;

/// <summary>
/// messaging/PresenceService'e senkron (gRPC) erişim sözleşmesi — CodeGen dışı, elle eklendi
/// (bkz. proje kararı: teklif/mesaj bildirimleri Messaging'in kalıcı SignalR bağlantısı üzerinden
/// merkezileşir). Kullanıcı çevrimiçiyse anlık bildirim gönderir; DeliveredLive=false dönerse
/// çağıran kendi e-posta gönderimini tetiklemeli.
/// </summary>
public interface IPresenceClient
{
    Task<bool> NotifyAsync(Guid userId, string title, string body, string linkPath, CancellationToken cancellationToken = default);
}

/// <summary><see cref="IPresenceClient"/>'in Messaging servisine gRPC ile bağlanan gerçek implementasyonu.</summary>
public sealed class PresenceClient(PresenceService.PresenceServiceClient client) : IPresenceClient
{
    public async Task<bool> NotifyAsync(Guid userId, string title, string body, string linkPath, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await client.NotifyAsync(
                new NotifyRequest { UserId = userId.ToString(), Title = title, Body = body, LinkPath = linkPath },
                cancellationToken: cancellationToken);
            return response.DeliveredLive;
        }
        catch (RpcException)
        {
            // Messaging geçici olarak erişilemez olsa bile teklif/yorum akışı bloklanmamalı —
            // en kötü ihtimalle e-posta gönderilir (çağıran false dönünce onu tetikliyor zaten).
            return false;
        }
    }
}
