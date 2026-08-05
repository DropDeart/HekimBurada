using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Messaging.Hubs;

/// <summary>
/// Bir Offer'a bağlı pazarlık sohbetinin gerçek zamanlı teslimatı. CodeGen dışı, elle eklendi —
/// BaseForge bugün SignalR üretmiyor (bkz. plan Faz D, proje hafızası). Bağlantı JWT ile korunur;
/// token, WebSocket handshake header taşıyamadığından query string'den okunur
/// (bkz. Program.cs "OnMessageReceived" post-configure).
/// </summary>
[Authorize]
public sealed class MessageHub : Hub
{
    /// <summary>Bağlanan istemci, <c>?offerId=</c> query string'iyle ilgili teklifin odasına otomatik katılır.</summary>
    public override async Task OnConnectedAsync()
    {
        var offerId = Context.GetHttpContext()?.Request.Query["offerId"].ToString();
        if (!string.IsNullOrWhiteSpace(offerId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, GroupName(offerId));
        }

        await base.OnConnectedAsync();
    }

    /// <summary>Bir Offer'ın sohbet odası için grup adı — <c>CreateMessageHandler</c> ile aynı kuralı paylaşır.</summary>
    public static string GroupName(Guid offerId) => GroupName(offerId.ToString());

    private static string GroupName(string offerId) => $"offer:{offerId}";
}
