using System.Security.Claims;
using Identity.Data;
using Identity.Entities;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Identity.Controllers;

/// <summary>Ortak Giriş SPA'sının kullandığı e-posta/parola + dış sağlayıcı oturum + profil uçları.</summary>
[ApiController]
[Route("api/account")]
public sealed class AccountApiController : ControllerBase
{
    /// <summary>
    /// Profil uçları hem Ortak Giriş SPA'sının çerezini (cookie) hem de bağımsız SPA'ların
    /// ROPC ile aldığı Bearer access token'ını kabul eder — ikisi de aynı kullanıcıyı temsil eder.
    /// Değerler literal yazılır çünkü öznitelik argümanı derleme-zamanı sabiti olmalı
    /// (OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme const değil).
    /// </summary>
    private const string ProfileAuthSchemes = "Identity.Application,OpenIddict.Validation.AspNetCore";

    private static readonly HashSet<string> AllowedAvatarContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/png", "image/webp", "image/gif",
    };

    private const long MaxAvatarBytes = 2 * 1024 * 1024; // 2 MB

    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IWebHostEnvironment _env;
    private readonly IdentityServiceDbContext _db;
    private readonly Email.EmailOtpService _emailOtpService;

    public AccountApiController(
        SignInManager<ApplicationUser> signInManager,
        UserManager<ApplicationUser> userManager,
        IWebHostEnvironment env,
        IdentityServiceDbContext db,
        Email.EmailOtpService emailOtpService)
    {
        _signInManager = signInManager;
        _userManager = userManager;
        _env = env;
        _db = db;
        _emailOtpService = emailOtpService;
    }

    [HttpGet("me")]
    [Authorize(AuthenticationSchemes = ProfileAuthSchemes)]
    public async Task<IActionResult> Me()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized();
        }

        var roles = await _userManager.GetRolesAsync(user);
        var hasPassword = await _userManager.HasPasswordAsync(user);
        return Ok(new MeResponse(user.Id, user.Email ?? user.UserName ?? string.Empty, user.FullName, user.AvatarUrl, hasPassword, roles));
    }

    [HttpPut("profile")]
    [Authorize(AuthenticationSchemes = ProfileAuthSchemes)]
    public async Task<IActionResult> UpdateProfile(UpdateProfileRequest request)
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized();
        }

        user.FullName = string.IsNullOrWhiteSpace(request.FullName) ? null : request.FullName.Trim();
        await _userManager.UpdateAsync(user);
        return Ok();
    }

    [HttpPost("change-password")]
    [Authorize(AuthenticationSchemes = ProfileAuthSchemes)]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized();
        }

        if (string.IsNullOrWhiteSpace(request.NewPassword))
        {
            return BadRequest(new ErrorResponse("Yeni parola gerekli."));
        }

        var hasPassword = await _userManager.HasPasswordAsync(user);
        var result = hasPassword
            ? await _userManager.ChangePasswordAsync(user, request.CurrentPassword ?? string.Empty, request.NewPassword)
            : await _userManager.AddPasswordAsync(user, request.NewPassword);

        if (!result.Succeeded)
        {
            return BadRequest(new ErrorResponse(string.Join(" ", result.Errors.Select(e => e.Description))));
        }

        return Ok();
    }

    [HttpPost("avatar")]
    [Authorize(AuthenticationSchemes = ProfileAuthSchemes)]
    [RequestSizeLimit(MaxAvatarBytes + 4096)]
    public async Task<IActionResult> UploadAvatar(IFormFile? file)
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized();
        }

        if (file is null || file.Length == 0)
        {
            return BadRequest(new ErrorResponse("Dosya gerekli."));
        }

        if (file.Length > MaxAvatarBytes)
        {
            return BadRequest(new ErrorResponse("Dosya en fazla 2 MB olabilir."));
        }

        if (!AllowedAvatarContentTypes.Contains(file.ContentType))
        {
            return BadRequest(new ErrorResponse("Sadece JPEG, PNG, WEBP veya GIF yükleyebilirsiniz."));
        }

        var extension = file.ContentType switch
        {
            "image/jpeg" => ".jpg",
            "image/png" => ".png",
            "image/webp" => ".webp",
            "image/gif" => ".gif",
            _ => ".bin",
        };

        var uploadsDir = Path.Combine(_env.WebRootPath, "uploads", "avatars");
        Directory.CreateDirectory(uploadsDir);

        var fileName = $"{user.Id:N}-{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(uploadsDir, fileName);

        await using (var stream = System.IO.File.Create(filePath))
        {
            await file.CopyToAsync(stream);
        }

        // Eski yüklenmiş avatar'ı (varsa) temizle — dış sağlayıcı URL'lerine (Google vb.) dokunma.
        if (!string.IsNullOrWhiteSpace(user.AvatarUrl) && user.AvatarUrl.StartsWith("/uploads/avatars/", StringComparison.Ordinal))
        {
            var oldPath = Path.Combine(_env.WebRootPath, user.AvatarUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
            if (System.IO.File.Exists(oldPath))
            {
                System.IO.File.Delete(oldPath);
            }
        }

        user.AvatarUrl = $"/uploads/avatars/{fileName}";
        await _userManager.UpdateAsync(user);
        return Ok(new AvatarResponse(user.AvatarUrl));
    }

    /// <summary>Yüklenmiş profil fotoğrafını kaldırır — dış sağlayıcı (Google vb.) URL'lerine dokunmaz, sadece kendi yüklediğimiz dosyayı siler.</summary>
    [HttpDelete("avatar")]
    [Authorize(AuthenticationSchemes = ProfileAuthSchemes)]
    public async Task<IActionResult> DeleteAvatar()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized();
        }

        if (!string.IsNullOrWhiteSpace(user.AvatarUrl) && user.AvatarUrl.StartsWith("/uploads/avatars/", StringComparison.Ordinal))
        {
            var oldPath = Path.Combine(_env.WebRootPath, user.AvatarUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
            if (System.IO.File.Exists(oldPath))
            {
                System.IO.File.Delete(oldPath);
            }
        }

        user.AvatarUrl = null;
        await _userManager.UpdateAsync(user);
        return Ok();
    }

    [HttpGet("providers")]
    public async Task<IActionResult> Providers()
    {
        var schemes = await _signInManager.GetExternalAuthenticationSchemesAsync();
        return Ok(schemes.Select(s => s.Name));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new ErrorResponse("E-posta ve parola gerekli."));
        }

        var result = await _signInManager.PasswordSignInAsync(request.Email, request.Password, isPersistent: false, lockoutOnFailure: true);
        if (result.IsNotAllowed)
        {
            return BadRequest(new ErrorResponse("E-posta adresiniz henüz doğrulanmadı. Kayıt sırasında gönderilen kodu girin."));
        }

        if (!result.Succeeded)
        {
            return BadRequest(new ErrorResponse("E-posta veya parola hatalı."));
        }

        return Ok();
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new ErrorResponse("Tüm alanları doldurun."));
        }

        if (string.IsNullOrWhiteSpace(request.Specialty) || string.IsNullOrWhiteSpace(request.DiplomaNo) || request.DistrictId == Guid.Empty)
        {
            return BadRequest(new ErrorResponse("Uzmanlık alanı, diploma/tescil no ve ilçe gerekli."));
        }

        // Uzmanlık alanı yönetilen listeden seçilmeli — serbest metin, Community'nin topluluk
        // kategorisi eşleşmesini (birebir string karşılaştırması) bozar (bkz. SpecialtiesApiController).
        var specialty = request.Specialty.Trim();
        var validSpecialty = await _db.Specialties.AnyAsync(
            s => s.Name.ToLower() == specialty.ToLower(), HttpContext.RequestAborted);
        if (!validSpecialty)
        {
            return BadRequest(new ErrorResponse("Geçersiz uzmanlık alanı."));
        }

        // İlçe de yönetilen listeden seçilmeli — serbest metin (eski Region alanı) "istanbul"/"İstanbul"
        // gibi farklı yazımlarla RegionAdmin'in bölge kuyruğunu sessizce boş gösteriyordu.
        var validDistrict = await _db.Districts.AnyAsync(d => d.Id == request.DistrictId, HttpContext.RequestAborted);
        if (!validDistrict)
        {
            return BadRequest(new ErrorResponse("Geçersiz ilçe."));
        }

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FullName = string.IsNullOrWhiteSpace(request.FullName) ? null : request.FullName,
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            return BadRequest(new ErrorResponse(string.Join(" ", result.Errors.Select(e => e.Description))));
        }

        await _userManager.AddToRoleAsync(user, SeedData.UserRole);

        // Hesap, belge yüklenip admin onaylayana kadar 'pending' — HekimBurada'nın kapalı-platform
        // kuralı burada başlıyor (bkz. Marketplace/Community'deki verification gate).
        _db.DoctorProfiles.Add(new DoctorProfile
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Specialty = specialty,
            DiplomaNo = request.DiplomaNo.Trim(),
            DistrictId = request.DistrictId,
            VerificationStatus = DoctorVerificationStatus.Pending,
        });
        await _db.SaveChangesAsync();

        // Sign-in YOK — e-posta OTP doğrulanana kadar hesap RequireConfirmedEmail yüzünden zaten
        // giriş yapamaz (bkz. Program.cs). Kullanıcı önce EmailVerificationController.Verify'a gider.
        await _emailOtpService.IssueAndSendAsync(user, HttpContext.RequestAborted);
        return Ok(new RegisterResponse(user.Id));
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        await _signInManager.SignOutAsync();
        return Ok();
    }

    [HttpGet("external/{provider}")]
    public IActionResult ExternalLogin(string provider, [FromQuery] string returnUrl = "/")
    {
        var redirectUrl = Url.Action(nameof(ExternalLoginCallback), values: new { returnUrl })
            ?? throw new InvalidOperationException("Callback URL çözümlenemedi.");
        var properties = _signInManager.ConfigureExternalAuthenticationProperties(provider, redirectUrl);
        return Challenge(properties, provider);
    }

    [HttpGet("external-callback")]
    public async Task<IActionResult> ExternalLoginCallback([FromQuery] string returnUrl = "/")
    {
        var info = await _signInManager.GetExternalLoginInfoAsync();
        if (info is null)
        {
            return Redirect("/Account/Login?error=external");
        }

        var signIn = await _signInManager.ExternalLoginSignInAsync(
            info.LoginProvider, info.ProviderKey, isPersistent: false, bypassTwoFactor: true);
        if (signIn.Succeeded)
        {
            return Redirect(returnUrl);
        }

        var email = info.Principal.FindFirstValue(ClaimTypes.Email) ?? info.Principal.FindFirstValue(ClaimTypes.Name);
        if (string.IsNullOrWhiteSpace(email))
        {
            return Redirect("/Account/Login?error=external");
        }

        var user = await _userManager.FindByEmailAsync(email);
        if (user is null)
        {
            var displayName = info.Principal.FindFirstValue(ClaimTypes.Name);
            var picture = info.Principal.FindFirstValue("picture");
            user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                EmailConfirmed = true,
                FullName = string.IsNullOrWhiteSpace(displayName) || displayName == email ? null : displayName,
                AvatarUrl = string.IsNullOrWhiteSpace(picture) ? null : picture,
            };
            var created = await _userManager.CreateAsync(user);
            if (!created.Succeeded)
            {
                return Redirect("/Account/Login?error=external");
            }

            await _userManager.AddToRoleAsync(user, SeedData.UserRole);

            // Sosyal girişle oluşan hesap da doğrulama kapısına tabi — Specialty/DiplomaNo/DistrictId
            // boş bırakılır (DistrictId = Guid.Empty), kullanıcı profilini tamamlayıp belge yükleyene
            // kadar 'pending' kalır
            // (bkz. DoctorVerificationController.UploadDocument — profil bilgisi eksikse belge
            // yükleme reddedilir, önce profilin tamamlanması istenir).
            _db.DoctorProfiles.Add(new DoctorProfile
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                VerificationStatus = DoctorVerificationStatus.Pending,
            });
            await _db.SaveChangesAsync();
        }

        await _userManager.AddLoginAsync(user, info);
        await _signInManager.SignInAsync(user, isPersistent: false);
        return Redirect(returnUrl);
    }
}

public sealed record LoginRequest(string Email, string Password);

public sealed record RegisterRequest(string? FullName, string Email, string Password, string Specialty, string DiplomaNo, Guid DistrictId);

public sealed record RegisterResponse(Guid UserId);

public sealed record UpdateProfileRequest(string? FullName);

public sealed record ChangePasswordRequest(string? CurrentPassword, string NewPassword);

public sealed record MeResponse(Guid Id, string Email, string? FullName, string? AvatarUrl, bool HasPassword, IEnumerable<string> Roles);

public sealed record AvatarResponse(string AvatarUrl);

public sealed record ErrorResponse(string Error);
