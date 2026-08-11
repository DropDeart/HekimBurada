using System.Text.RegularExpressions;
using Identity.Data;
using Identity.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Identity.Controllers;

/// <summary>
/// Profil &gt; Adres Bilgilerim uçları. Yalnızca çağıranın kendi adresleri döner/değiştirilir.
/// CodeGen tarafından üretilmez, elle yazılmıştır.
/// </summary>
[ApiController]
[Route("api/account/addresses")]
[Authorize(AuthenticationSchemes = "Identity.Application,OpenIddict.Validation.AspNetCore")]
public sealed partial class AddressesApiController : ControllerBase
{
    [GeneratedRegex(@"^(\+90|0)?[1-9]\d{9}$")]
    private static partial Regex PhonePattern();

    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IdentityServiceDbContext _db;

    public AddressesApiController(UserManager<ApplicationUser> userManager, IdentityServiceDbContext db)
    {
        _userManager = userManager;
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized();
        }

        var addresses = await _db.Addresses
            .Where(a => a.UserId == user.Id)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync(HttpContext.RequestAborted);

        var rows = new List<AddressRow>();
        foreach (var a in addresses)
        {
            rows.Add(new AddressRow(a.Id, a.Title, a.FullAddress, a.DistrictId, await FormatRegionAsync(a.DistrictId), a.Phone, a.CreatedAt));
        }

        return Ok(rows);
    }

    [HttpPost]
    public async Task<IActionResult> Create(AddressRequest request)
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized();
        }

        var title = request.Title?.Trim();
        var fullAddress = request.FullAddress?.Trim();
        if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(fullAddress))
        {
            return BadRequest(new ErrorResponse("Başlık ve açık adres zorunludur."));
        }

        if (request.DistrictId is null || request.DistrictId == Guid.Empty
            || !await _db.Districts.AnyAsync(d => d.Id == request.DistrictId, HttpContext.RequestAborted))
        {
            return BadRequest(new ErrorResponse("Geçerli bir il/ilçe seçin."));
        }

        var phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        if (phone is not null && !PhonePattern().IsMatch(phone.Replace(" ", string.Empty)))
        {
            return BadRequest(new ErrorResponse("Geçerli bir telefon numarası girin (örn. 0532 111 22 33)."));
        }

        var address = new Address
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Title = title,
            FullAddress = fullAddress,
            DistrictId = request.DistrictId.Value,
            Phone = phone,
        };
        _db.Addresses.Add(address);
        await _db.SaveChangesAsync(HttpContext.RequestAborted);

        return Ok(new AddressRow(address.Id, address.Title, address.FullAddress, address.DistrictId, await FormatRegionAsync(address.DistrictId), address.Phone, address.CreatedAt));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized();
        }

        var address = await _db.Addresses.FirstOrDefaultAsync(a => a.Id == id && a.UserId == user.Id, HttpContext.RequestAborted);
        if (address is null)
        {
            return NotFound();
        }

        _db.Addresses.Remove(address);
        await _db.SaveChangesAsync(HttpContext.RequestAborted);

        return NoContent();
    }

    private async Task<string> FormatRegionAsync(Guid districtId)
    {
        var row = await (
            from d in _db.Districts
            join p in _db.Provinces on d.ProvinceId equals p.Id
            where d.Id == districtId
            select new { DistrictName = d.Name, ProvinceName = p.Name }
        ).FirstOrDefaultAsync(HttpContext.RequestAborted);

        return row is null ? "—" : $"{row.DistrictName}, {row.ProvinceName}";
    }
}

public sealed record AddressRow(Guid Id, string Title, string FullAddress, Guid DistrictId, string Region, string? Phone, DateTimeOffset CreatedAt);

public sealed record AddressRequest(string? Title, string? FullAddress, Guid? DistrictId, string? Phone);
