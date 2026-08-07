using Identity.Data;
using Identity.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Identity.Controllers;

/// <summary>
/// Kayıt formunun uzmanlık alanı listesi. Liste herkese açık (kayıt formu login öncesi çağırır),
/// ekleme yalnızca SuperAdmin'e açık — topluluk kategorisi eşleşmesinin bozulmaması için (bkz.
/// Community/Integration/SyncMembershipOnDoctorProfileUpdated.cs) serbest metin yerine kapalı bir
/// küme kullanılıyor. CodeGen tarafından üretilmez, elle yazılmıştır.
/// </summary>
[ApiController]
[Route("api")]
public sealed class SpecialtiesApiController : ControllerBase
{
    private const string ProfileAuthSchemes = "Identity.Application,OpenIddict.Validation.AspNetCore";

    private readonly IdentityServiceDbContext _db;

    public SpecialtiesApiController(IdentityServiceDbContext db)
    {
        _db = db;
    }

    [HttpGet("specialties")]
    public async Task<IActionResult> List()
    {
        var specialties = await _db.Specialties
            .OrderBy(s => s.Name)
            .Select(s => new SpecialtyRow(s.Id, s.Name))
            .ToListAsync(HttpContext.RequestAborted);

        return Ok(specialties);
    }

    [HttpPost("admin/specialties")]
    [Authorize(AuthenticationSchemes = ProfileAuthSchemes, Roles = SeedData.SuperAdminRole)]
    public async Task<IActionResult> Add(AddSpecialtyRequest request)
    {
        var name = request.Name?.Trim();
        if (string.IsNullOrWhiteSpace(name))
        {
            return BadRequest(new ErrorResponse("Uzmanlık alanı adı gerekli."));
        }

        if (name.Length > 150)
        {
            return BadRequest(new ErrorResponse("Uzmanlık alanı adı en fazla 150 karakter olabilir."));
        }

        var exists = await _db.Specialties.AnyAsync(
            s => s.Name.ToLower() == name.ToLower(), HttpContext.RequestAborted);
        if (exists)
        {
            return BadRequest(new ErrorResponse("Bu uzmanlık alanı zaten kayıtlı."));
        }

        var specialty = new Specialty { Id = Guid.NewGuid(), Name = name };
        _db.Specialties.Add(specialty);
        await _db.SaveChangesAsync(HttpContext.RequestAborted);

        return Ok(new SpecialtyRow(specialty.Id, specialty.Name));
    }

    [HttpPut("admin/specialties/{id:guid}")]
    [Authorize(AuthenticationSchemes = ProfileAuthSchemes, Roles = SeedData.SuperAdminRole)]
    public async Task<IActionResult> Update(Guid id, UpdateSpecialtyRequest request)
    {
        var name = request.Name?.Trim();
        if (string.IsNullOrWhiteSpace(name))
        {
            return BadRequest(new ErrorResponse("Uzmanlık alanı adı gerekli."));
        }

        if (name.Length > 150)
        {
            return BadRequest(new ErrorResponse("Uzmanlık alanı adı en fazla 150 karakter olabilir."));
        }

        var specialty = await _db.Specialties.FirstOrDefaultAsync(s => s.Id == id, HttpContext.RequestAborted);
        if (specialty is null)
        {
            return NotFound();
        }

        var exists = await _db.Specialties.AnyAsync(
            s => s.Id != id && s.Name.ToLower() == name.ToLower(), HttpContext.RequestAborted);
        if (exists)
        {
            return BadRequest(new ErrorResponse("Bu uzmanlık alanı zaten kayıtlı."));
        }

        specialty.Name = name;
        await _db.SaveChangesAsync(HttpContext.RequestAborted);

        return Ok(new SpecialtyRow(specialty.Id, specialty.Name));
    }

    [HttpDelete("admin/specialties/{id:guid}")]
    [Authorize(AuthenticationSchemes = ProfileAuthSchemes, Roles = SeedData.SuperAdminRole)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var specialty = await _db.Specialties.FirstOrDefaultAsync(s => s.Id == id, HttpContext.RequestAborted);
        if (specialty is null)
        {
            return NotFound();
        }

        _db.Specialties.Remove(specialty);
        await _db.SaveChangesAsync(HttpContext.RequestAborted);

        return NoContent();
    }
}

public sealed record SpecialtyRow(Guid Id, string Name);

public sealed record AddSpecialtyRequest(string? Name);

public sealed record UpdateSpecialtyRequest(string? Name);
