using System.Security.Claims;

namespace Messaging.Authorization;

/// <summary>
/// Çağıranın kimliğini JWT claim'lerinden çözer — CodeGen dışı, elle eklendi (bkz. aynı desen
/// diğer servislerde). Rol/sub claim'lerini hem kısa (OpenIddict: "sub") hem uzun
/// (<see cref="ClaimTypes"/>) adlarıyla arar — JWT'deki claim tipi .NET sürümüne/ayarına göre değişebilir.
/// </summary>
internal static class AdminAuth
{
    public static Guid? GetUserId(ClaimsPrincipal user)
    {
        var raw = user.FindFirst("sub")?.Value ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(raw, out var id) ? id : null;
    }
}
