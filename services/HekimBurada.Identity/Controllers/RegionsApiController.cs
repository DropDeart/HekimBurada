using Identity.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Identity.Controllers;

/// <summary>
/// Türkiye il/ilçe referans verisi — kayıt formundaki (login öncesi) ve admin panelindeki (RegionAdmin
/// bölge ataması) kademeli il/ilçe seçimi için. Herkese açık, salt okunur (veri sabit, admin ekranından
/// değiştirilmez). CodeGen tarafından üretilmez, elle yazılmıştır.
/// </summary>
[ApiController]
[Route("api")]
public sealed class RegionsApiController : ControllerBase
{
    private readonly IdentityServiceDbContext _db;

    public RegionsApiController(IdentityServiceDbContext db)
    {
        _db = db;
    }

    /// <summary>81 il, her biri kendi ilçeleriyle iç içe (tek çağrıda tüm ağaç — ~1000 satır, kademeli
    /// select client-side filtreleyebilsin diye).</summary>
    [HttpGet("regions")]
    public async Task<IActionResult> List()
    {
        var districts = await _db.Districts
            .OrderBy(d => d.Name)
            .Select(d => new { d.Id, d.ProvinceId, d.Name })
            .ToListAsync(HttpContext.RequestAborted);

        var districtsByProvince = districts.ToLookup(d => d.ProvinceId);

        var provinces = await _db.Provinces
            .OrderBy(p => p.Name)
            .Select(p => new { p.Id, p.Name })
            .ToListAsync(HttpContext.RequestAborted);

        var result = provinces.Select(p => new ProvinceRow(
            p.Id,
            p.Name,
            districtsByProvince[p.Id].Select(d => new DistrictRow(d.Id, d.Name)).ToList()));

        return Ok(result);
    }
}

public sealed record DistrictRow(Guid Id, string Name);

public sealed record ProvinceRow(Guid Id, string Name, IReadOnlyList<DistrictRow> Districts);
