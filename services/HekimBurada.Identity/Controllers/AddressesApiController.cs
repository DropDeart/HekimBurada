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
public sealed class AddressesApiController : ControllerBase
{
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
            .Select(a => new AddressRow(a.Id, a.Title, a.FullAddress, a.City, a.District, a.Phone, a.CreatedAt))
            .ToListAsync(HttpContext.RequestAborted);

        return Ok(addresses);
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
        var city = request.City?.Trim();
        if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(fullAddress) || string.IsNullOrWhiteSpace(city))
        {
            return BadRequest(new ErrorResponse("Başlık, açık adres ve il zorunludur."));
        }

        var address = new Address
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Title = title,
            FullAddress = fullAddress,
            City = city,
            District = string.IsNullOrWhiteSpace(request.District) ? null : request.District.Trim(),
            Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim(),
        };
        _db.Addresses.Add(address);
        await _db.SaveChangesAsync(HttpContext.RequestAborted);

        return Ok(new AddressRow(address.Id, address.Title, address.FullAddress, address.City, address.District, address.Phone, address.CreatedAt));
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
}

public sealed record AddressRow(Guid Id, string Title, string FullAddress, string City, string? District, string? Phone, DateTimeOffset CreatedAt);

public sealed record AddressRequest(string? Title, string? FullAddress, string? City, string? District, string? Phone);
