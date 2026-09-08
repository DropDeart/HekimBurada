using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;

namespace Messaging.Presence;

/// <summary>
/// SignalR'ın <c>Clients.User(id)</c> ile hedefleme yapabilmesi için bağlantıyı kullanıcı kimliğine
/// eşler — varsayılan sağlayıcı yalnızca <see cref="ClaimTypes.NameIdentifier"/>'a bakar, ama JWT'deki
/// claim tipi kısa ("sub") da olabilir (bkz. AdminAuth.GetUserId, aynı desen). CodeGen dışı, elle eklendi.
/// </summary>
public sealed class HubUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection) =>
        connection.User?.FindFirst("sub")?.Value ?? connection.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
}
