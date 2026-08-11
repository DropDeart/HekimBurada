using System.Security.Claims;

namespace Gateway.Authorization;

/// <summary>
/// Duyuru yönetimi (Announcement CRUD) için rol/sahiplik kontrolü — CodeGen dışı, elle eklendi.
/// Identity servisinin ihraç ettiği rol adlarıyla (SeedData.AdminRole/SuperAdminRole) birebir
/// eşleşmeli; ayrı deploy edilen serviste derleme zamanı paylaşım yok.
///
/// Rol/sub claim'lerini hem kısa (OpenIddict: "role"/"sub") hem uzun (<see cref="ClaimTypes"/>) adlarıyla
/// arar — BaseForge.API'nin EnableJwt'i TokenValidationParameters.RoleClaimType/NameClaimType'ı
/// yeniden eşlemiyor, dolayısıyla JWT'deki claim tipi .NET sürümüne/ayarına göre değişebilir.
/// </summary>
internal static class AdminAuth
{
    private const string AdminRole = "Admin";
    private const string SuperAdminRole = "SuperAdmin";

    public static bool IsStaffAdmin(ClaimsPrincipal user) =>
        HasRole(user, AdminRole) || HasRole(user, SuperAdminRole);

    private static bool HasRole(ClaimsPrincipal user, string role) =>
        user.Claims.Any(c => (c.Type == "role" || c.Type == ClaimTypes.Role) && c.Value == role);

    public static Guid? GetUserId(ClaimsPrincipal user)
    {
        var raw = user.FindFirst("sub")?.Value ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(raw, out var id) ? id : null;
    }
}
