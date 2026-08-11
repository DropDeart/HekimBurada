using Gateway.Authorization;
using Gateway.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Gateway.Controllers;

/// <summary>
/// Site geneli ayarlar (logo/favicon/GA/varsayılan meta) — tek satırlık singleton. CodeGen dışı,
/// elle eklendi (spec.yaml'a eklemedik — bkz. proje notu: hand-written entity'ler codegen regen
/// riskinden kaçınmak için MediatR/CQRS'siz, DbContext doğrudan kullanılarak yazılıyor).
/// </summary>
[ApiController]
[Authorize]
[Route("api/site-settings")]
public sealed class SiteSettingsController : ControllerBase
{
    private readonly GatewayDbContext _db;

    public SiteSettingsController(GatewayDbContext db)
    {
        _db = db;
    }

    /// <summary>Ayarları döner — hiç satır yoksa (ör. taze bir DB'de) boş varsayılanlarla bir tane oluşturur.</summary>
    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<SiteSettingsDto>> Get(CancellationToken cancellationToken)
    {
        var settings = await GetOrCreateAsync(cancellationToken);
        return Ok(SiteSettingsDto.From(settings));
    }

    /// <summary>Ayarları günceller — yalnızca Admin/SuperAdmin.</summary>
    [HttpPut]
    public async Task<ActionResult<SiteSettingsDto>> Update(UpdateSiteSettingsRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (!AdminAuth.IsStaffAdmin(User))
        {
            return Forbid();
        }

        var settings = await GetOrCreateAsync(cancellationToken);
        settings.LogoUrl = request.LogoUrl;
        settings.FaviconUrl = request.FaviconUrl;
        settings.GaMeasurementId = request.GaMeasurementId;
        settings.DefaultMetaTitle = request.DefaultMetaTitle;
        settings.DefaultMetaDescription = request.DefaultMetaDescription;
        await _db.SaveChangesAsync(cancellationToken);

        return Ok(SiteSettingsDto.From(settings));
    }

    private async Task<Entities.SiteSettings> GetOrCreateAsync(CancellationToken cancellationToken)
    {
        var settings = await _db.Settings.FirstOrDefaultAsync(cancellationToken);
        if (settings is not null)
        {
            return settings;
        }

        settings = new Entities.SiteSettings();
        _db.Settings.Add(settings);
        await _db.SaveChangesAsync(cancellationToken);
        return settings;
    }
}

public sealed record SiteSettingsDto(
    string? LogoUrl,
    string? FaviconUrl,
    string? GaMeasurementId,
    string? DefaultMetaTitle,
    string? DefaultMetaDescription)
{
    public static SiteSettingsDto From(Entities.SiteSettings entity) => new(
        entity.LogoUrl,
        entity.FaviconUrl,
        entity.GaMeasurementId,
        entity.DefaultMetaTitle,
        entity.DefaultMetaDescription);
}

public sealed record UpdateSiteSettingsRequest(
    string? LogoUrl,
    string? FaviconUrl,
    string? GaMeasurementId,
    string? DefaultMetaTitle,
    string? DefaultMetaDescription);
