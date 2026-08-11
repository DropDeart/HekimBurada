using System.Security.Claims;
using System.Text.Json;
using BaseForge.Core.CQRS;
using BaseForge.Infrastructure.Messaging;
using Identity.Data;
using Identity.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Identity.Controllers;

/// <summary>
/// Doktorluk belgesi (JPEG/PNG/PDF) yükleme + admin onay/red uçları. CodeGen tarafından üretilmez —
/// HekimBurada'ya özgü, elle yazılmıştır (bkz. plan Faz C).
/// </summary>
[ApiController]
[Route("api")]
public sealed class DoctorVerificationController : ControllerBase
{
    private const string ProfileAuthSchemes = "Identity.Application,OpenIddict.Validation.AspNetCore";

    private static readonly Dictionary<string, string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        ["image/jpeg"] = ".jpg",
        ["image/png"] = ".png",
        ["application/pdf"] = ".pdf",
    };

    private const long MaxDocumentBytes = 10 * 1024 * 1024; // 10 MB

    /// <summary>Identity'nin RabbitMQ'ya yayınladığı doğrulama olayı — Community bu adı/şekli bekliyor (bkz. specs/community.yaml subscribes).</summary>
    private const string DoctorProfileUpdatedEventType = "identity/DoctorProfileUpdated";

    private readonly IdentityServiceDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IRabbitMqPublisher _publisher;
    private readonly string _uploadsRoot;

    public DoctorVerificationController(
        IdentityServiceDbContext db,
        UserManager<ApplicationUser> userManager,
        IRabbitMqPublisher publisher,
        IConfiguration configuration)
    {
        _db = db;
        _userManager = userManager;
        _publisher = publisher;
        _uploadsRoot = configuration["Uploads:Path"] ?? "/app/uploads";
    }

    // ---- Doktor kendi belgesini yükler ----

    [HttpPost("account/verification-document")]
    [Authorize(AuthenticationSchemes = ProfileAuthSchemes)]
    [RequestSizeLimit(MaxDocumentBytes + 4096)]
    public async Task<IActionResult> UploadDocument(IFormFile? file)
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized();
        }

        var profile = await _db.DoctorProfiles.FirstOrDefaultAsync(p => p.UserId == user.Id, HttpContext.RequestAborted);
        if (profile is null)
        {
            return BadRequest(new ErrorResponse("Doktor profili bulunamadı — önce kayıt/profil tamamlama adımını bitirin."));
        }

        if (file is null || file.Length == 0)
        {
            return BadRequest(new ErrorResponse("Dosya gerekli."));
        }

        if (file.Length > MaxDocumentBytes)
        {
            return BadRequest(new ErrorResponse("Dosya en fazla 10 MB olabilir."));
        }

        if (!AllowedContentTypes.TryGetValue(file.ContentType, out var extension))
        {
            return BadRequest(new ErrorResponse("Sadece JPEG, PNG veya PDF yükleyebilirsiniz."));
        }

        var userDir = Path.Combine(_uploadsRoot, "doctors", user.Id.ToString("N"));
        Directory.CreateDirectory(userDir);

        var fileName = $"{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(userDir, fileName);

        await using (var stream = System.IO.File.Create(filePath))
        {
            await file.CopyToAsync(stream);
        }

        profile.VerificationDocumentPath = Path.Combine("doctors", user.Id.ToString("N"), fileName).Replace('\\', '/');
        profile.VerificationDocumentContentType = file.ContentType;
        // Belge yeniden yüklendiğinde (ör. red sonrası) tekrar incelemeye düşsün.
        if (profile.VerificationStatus == DoctorVerificationStatus.Rejected)
        {
            profile.VerificationStatus = DoctorVerificationStatus.Pending;
        }

        await _db.SaveChangesAsync();
        return Ok();
    }

    // ---- Doktor: kendi profil/doğrulama durumunu görür (frontend onboarding akışını buna göre yönlendirir) ----

    [HttpGet("account/doctor-profile")]
    [Authorize(AuthenticationSchemes = ProfileAuthSchemes)]
    public async Task<IActionResult> MyProfile()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized();
        }

        var profile = await _db.DoctorProfiles.FirstOrDefaultAsync(p => p.UserId == user.Id, HttpContext.RequestAborted);
        if (profile is null)
        {
            return NotFound();
        }

        return Ok(new DoctorProfileResponse(
            profile.Specialty,
            profile.DiplomaNo,
            await FormatRegionAsync(profile.DistrictId),
            profile.VerificationStatus,
            profile.VerificationDocumentPath is not null));
    }

    // ---- Admin: bekleyen doğrulamaları listele (SuperAdmin: tümü, RegionAdmin: yalnızca kendi bölgesi) ----

    [HttpGet("admin/verifications")]
    [Authorize(AuthenticationSchemes = ProfileAuthSchemes, Roles = $"{SeedData.SuperAdminRole},{SeedData.RegionAdminRole}")]
    public async Task<IActionResult> List([FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize switch { < 1 => 1, > 100 => 100, _ => pageSize };

        var query = _db.DoctorProfiles.AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(p => p.VerificationStatus == status);
        }

        if (!User.IsInRole(SeedData.SuperAdminRole))
        {
            // region claim artık serbest metin değil, Province.Id (bkz. AssignRegionAdmin) — Guid
            // parse edilemiyorsa ya claim hiç atanmamış ya da bozuk, ikisinde de kuyruk boş dönmeli.
            // RegionAdmin il bazlı görür (o ildeki tüm ilçeler) — DoctorProfile sadece DistrictId
            // taşıdığından önce o ile ait ilçe kimliklerini çözüp öyle filtreliyoruz.
            var region = User.FindFirstValue(SeedData.RegionClaimType);
            if (string.IsNullOrWhiteSpace(region) || !Guid.TryParse(region, out var regionProvinceId))
            {
                return Forbid();
            }

            var districtIdsInProvince = await _db.Districts
                .Where(d => d.ProvinceId == regionProvinceId)
                .Select(d => d.Id)
                .ToListAsync(HttpContext.RequestAborted);
            query = query.Where(p => districtIdsInProvince.Contains(p.DistrictId));
        }

        query = query.OrderBy(p => p.CreatedAt);
        var totalCount = await query.CountAsync(HttpContext.RequestAborted);
        var profiles = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(HttpContext.RequestAborted);

        var rows = new List<VerificationRow>(profiles.Count);
        foreach (var profile in profiles)
        {
            var user = await _userManager.FindByIdAsync(profile.UserId.ToString());
            rows.Add(new VerificationRow(
                profile.UserId,
                user?.Email ?? user?.UserName ?? string.Empty,
                user?.FullName,
                profile.Specialty,
                profile.DiplomaNo,
                await FormatRegionAsync(profile.DistrictId),
                profile.VerificationStatus,
                profile.VerificationDocumentPath is not null));
        }

        return Ok(new PagedResult<VerificationRow> { Items = rows, TotalCount = totalCount, Page = page, PageSize = pageSize });
    }

    [HttpPost("admin/verifications/{userId:guid}/approve")]
    [Authorize(AuthenticationSchemes = ProfileAuthSchemes, Roles = $"{SeedData.SuperAdminRole},{SeedData.RegionAdminRole}")]
    public async Task<IActionResult> Approve(Guid userId)
    {
        var profile = await LoadForAdminAsync(userId);
        if (profile is null)
        {
            return NotFound();
        }

        if (string.IsNullOrWhiteSpace(profile.VerificationDocumentPath))
        {
            return BadRequest(new ErrorResponse("Belge yüklenmeden onaylanamaz."));
        }

        profile.VerificationStatus = DoctorVerificationStatus.Approved;
        profile.VerifiedAt = DateTimeOffset.UtcNow;
        profile.VerifiedByAdminId = await CurrentAdminIdAsync();
        await _db.SaveChangesAsync();

        await PublishDoctorProfileUpdatedAsync(profile);
        return Ok();
    }

    [HttpPost("admin/verifications/{userId:guid}/reject")]
    [Authorize(AuthenticationSchemes = ProfileAuthSchemes, Roles = $"{SeedData.SuperAdminRole},{SeedData.RegionAdminRole}")]
    public async Task<IActionResult> Reject(Guid userId)
    {
        var profile = await LoadForAdminAsync(userId);
        if (profile is null)
        {
            return NotFound();
        }

        profile.VerificationStatus = DoctorVerificationStatus.Rejected;
        profile.VerifiedAt = DateTimeOffset.UtcNow;
        profile.VerifiedByAdminId = await CurrentAdminIdAsync();
        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpGet("admin/verification-document/{userId:guid}")]
    [Authorize(AuthenticationSchemes = ProfileAuthSchemes, Roles = $"{SeedData.SuperAdminRole},{SeedData.RegionAdminRole}")]
    public async Task<IActionResult> GetDocument(Guid userId)
    {
        var profile = await LoadForAdminAsync(userId);
        if (profile?.VerificationDocumentPath is null || profile.VerificationDocumentContentType is null)
        {
            return NotFound();
        }

        var fullPath = Path.Combine(_uploadsRoot, profile.VerificationDocumentPath.Replace('/', Path.DirectorySeparatorChar));
        if (!System.IO.File.Exists(fullPath))
        {
            return NotFound();
        }

        var stream = System.IO.File.OpenRead(fullPath);
        return File(stream, profile.VerificationDocumentContentType);
    }

    // ---- Admin: bir kullanıcıyı RegionAdmin yapıp bölge ataması (yalnızca SuperAdmin) ----

    [HttpPost("admin/users/{userId:guid}/region-admin")]
    [Authorize(AuthenticationSchemes = ProfileAuthSchemes, Roles = SeedData.SuperAdminRole)]
    public async Task<IActionResult> AssignRegionAdmin(Guid userId, AssignRegionAdminRequest request)
    {
        if (request.ProvinceId == Guid.Empty)
        {
            return BadRequest(new ErrorResponse("İl gerekli."));
        }

        var validProvince = await _db.Provinces.AnyAsync(p => p.Id == request.ProvinceId, HttpContext.RequestAborted);
        if (!validProvince)
        {
            return BadRequest(new ErrorResponse("Geçersiz il."));
        }

        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user is null)
        {
            return NotFound();
        }

        if (!await _userManager.IsInRoleAsync(user, SeedData.RegionAdminRole))
        {
            await _userManager.AddToRoleAsync(user, SeedData.RegionAdminRole);
        }

        var existingClaims = await _userManager.GetClaimsAsync(user);
        var oldRegionClaim = existingClaims.FirstOrDefault(c => c.Type == SeedData.RegionClaimType);
        if (oldRegionClaim is not null)
        {
            await _userManager.RemoveClaimAsync(user, oldRegionClaim);
        }

        // Claim değeri artık serbest metin değil, Province.Id — bkz. List/LoadForAdminAsync'teki
        // Guid.TryParse karşılaştırması. RegionAdmin il bazlı görür (o ildeki tüm ilçeler).
        await _userManager.AddClaimAsync(user, new Claim(SeedData.RegionClaimType, request.ProvinceId.ToString()));
        return Ok();
    }

    private async Task<DoctorProfile?> LoadForAdminAsync(Guid userId)
    {
        var profile = await _db.DoctorProfiles.FirstOrDefaultAsync(p => p.UserId == userId, HttpContext.RequestAborted);
        if (profile is null)
        {
            return null;
        }

        if (!User.IsInRole(SeedData.SuperAdminRole))
        {
            var region = User.FindFirstValue(SeedData.RegionClaimType);
            if (string.IsNullOrWhiteSpace(region) || !Guid.TryParse(region, out var regionProvinceId))
            {
                return null;
            }

            var district = await _db.Districts.FirstOrDefaultAsync(d => d.Id == profile.DistrictId, HttpContext.RequestAborted);
            if (district is null || district.ProvinceId != regionProvinceId)
            {
                return null;
            }
        }

        return profile;
    }

    private async Task<Guid?> CurrentAdminIdAsync()
    {
        var admin = await _userManager.GetUserAsync(User);
        return admin?.Id;
    }

    /// <summary>DistrictId'yi "İlçe, İl" biçiminde okunabilir metne çevirir (admin ekranlarında gösterim
    /// için) — CodeGen dışı, elle eklendi. Profil henüz tamamlanmadıysa (DistrictId boş, bkz. sosyal
    /// girişle oluşan hesap) "—" döner.</summary>
    private async Task<string> FormatRegionAsync(Guid districtId)
    {
        if (districtId == Guid.Empty)
        {
            return "—";
        }

        var row = await (
            from d in _db.Districts
            join p in _db.Provinces on d.ProvinceId equals p.Id
            where d.Id == districtId
            select new { DistrictName = d.Name, ProvinceName = p.Name }
        ).FirstOrDefaultAsync(HttpContext.RequestAborted);

        return row is null ? "—" : $"{row.DistrictName}, {row.ProvinceName}";
    }

    private async Task PublishDoctorProfileUpdatedAsync(DoctorProfile profile)
    {
        // Bilinçli sadeleştirme: tam Outbox pattern değil (DB commit + publish tek transaction'da
        // değil) — IdentityServiceDbContext'i BaseForgeDbContext'ten türetmek OpenIddict/ASP.NET
        // Identity şemasıyla riskli bir karışım olurdu. Bu event düşük riskli bir read-model
        // senkronizasyonu (Community'nin Membership'i) olduğundan kabul edilebilir (bkz. plan Faz C).
        //
        // ÖNEMLİ — çift katmanlı zarf: BaseForge.CodeGen'in ürettiği her event class'ı (bkz.
        // Templates.Events / Templates.SubscriptionHandler) KENDİSİ de {EventId,OccurredAt,EventType,Data}
        // şeklini taşır; OutboxEventBus.PublishAsync bu NESNENİN TAMAMINI dış zarfın Data alanına
        // yazar (çift sarma). Community'nin ürettiği DoctorProfileUpdatedEvent/-EventData shadow'ı da
        // aynı deseni bekliyor — tek katman gönderirsek RabbitMqConsumerHostedService deserialize
        // edemez, mesaj sessizce '{queue}.dead'e düşer. Bu yüzden burada da iki katman kuruyoruz.
        var eventId = Guid.NewGuid();
        var occurredAt = DateTimeOffset.UtcNow;

        var shadowEvent = new DoctorProfileUpdatedShadowEvent(
            eventId,
            occurredAt,
            DoctorProfileUpdatedEventType,
            new DoctorProfileUpdatedInnerData(profile.UserId, profile.Specialty, profile.VerificationStatus));

        var envelope = new IdentityEventEnvelope(
            eventId,
            occurredAt,
            DoctorProfileUpdatedEventType,
            JsonSerializer.SerializeToElement(shadowEvent),
            null);

        await _publisher.PublishRawAsync(DoctorProfileUpdatedEventType, JsonSerializer.Serialize(envelope));
    }
}

/// <summary>
/// <c>BaseForge.Infrastructure.Messaging.EventEnvelope</c> ile birebir aynı şekil (o tip <c>internal</c>
/// olduğundan burada kendi kopyamızı tanımlıyoruz) — <c>RabbitMqConsumerHostedService</c>'in
/// tükettiği DIŞ JSON zarfıyla alan adı/sırası eşleşmeli.
/// </summary>
internal sealed record IdentityEventEnvelope(Guid EventId, DateTimeOffset OccurredAt, string EventType, JsonElement Data, string? CorrelationId);

/// <summary>
/// Community'nin <c>Integration/SyncMembershipOnDoctorProfileUpdated.cs</c>'te ürettiği
/// <c>DoctorProfileUpdatedEvent</c> shadow class'ıyla BİREBİR aynı şekil olmalı (elle senkronize edilir —
/// Identity'nin spec.yaml'ı olmadığından CodeGen bunu otomatik doğrulayamaz).
/// </summary>
internal sealed record DoctorProfileUpdatedShadowEvent(Guid EventId, DateTimeOffset OccurredAt, string EventType, DoctorProfileUpdatedInnerData Data);

/// <summary>Community'deki <c>DoctorProfileUpdatedEventData</c> ile birebir aynı alanlar olmalı.</summary>
internal sealed record DoctorProfileUpdatedInnerData(Guid UserId, string Specialty, string VerificationStatus);

public sealed record VerificationRow(
    Guid UserId,
    string Email,
    string? FullName,
    string Specialty,
    string DiplomaNo,
    string Region,
    string VerificationStatus,
    bool HasDocument);

public sealed record AssignRegionAdminRequest(Guid ProvinceId);

public sealed record DoctorProfileResponse(
    string Specialty,
    string DiplomaNo,
    string Region,
    string VerificationStatus,
    bool HasDocument);
