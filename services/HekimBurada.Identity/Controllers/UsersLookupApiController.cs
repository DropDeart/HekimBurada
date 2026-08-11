using Identity.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Identity.Controllers;

/// <summary>
/// Verilen kullanıcı ID'lerinin e-posta/ad soyad bilgisini döner — topluluk üye listesi gibi admin-dışı
/// ekranlarda (örn. bir topluluk admin'inin kendi üyelerini görmesi) kullanıcı adı göstermek için.
/// AdminUsersApiController'dan farklı olarak Admin rolü gerektirmez, herhangi bir giriş yapmış
/// kullanıcıya açıktır — sadece email/ad soyad döner, rol/doğrulama bilgisi içermez.
/// CodeGen tarafından üretilmez, elle yazılmıştır.
/// </summary>
[ApiController]
[Route("api/users")]
public sealed class UsersLookupApiController : ControllerBase
{
    private const string ProfileAuthSchemes = "Identity.Application,OpenIddict.Validation.AspNetCore";
    private const int MaxIds = 200;

    private readonly UserManager<ApplicationUser> _userManager;

    public UsersLookupApiController(UserManager<ApplicationUser> userManager)
    {
        _userManager = userManager;
    }

    /// <summary>Virgülle ayrılmış ID listesine (ör. ?ids=guid1,guid2) karşılık gelen kullanıcıları döner.</summary>
    [HttpGet]
    [Authorize(AuthenticationSchemes = ProfileAuthSchemes)]
    public async Task<IActionResult> Lookup([FromQuery] string? ids)
    {
        var idList = (ids ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(s => Guid.TryParse(s, out var g) ? g : (Guid?)null)
            .Where(g => g.HasValue)
            .Select(g => g!.Value)
            .Distinct()
            .Take(MaxIds)
            .ToList();

        var rows = new List<UserLookupRow>(idList.Count);
        foreach (var id in idList)
        {
            var user = await _userManager.FindByIdAsync(id.ToString());
            if (user is not null)
            {
                rows.Add(new UserLookupRow(user.Id, user.Email ?? user.UserName ?? string.Empty, user.FullName));
            }
        }

        return Ok(rows);
    }
}

public sealed record UserLookupRow(Guid Id, string Email, string? FullName);
