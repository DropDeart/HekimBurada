using Gateway.Authorization;
using Gateway.Data;
using Gateway.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Gateway.Controllers;

/// <summary>Anasayfa hero carousel slaytları CRUD'u. CodeGen dışı, elle eklendi.</summary>
[ApiController]
[Authorize]
[Route("api/carousel-slides")]
public sealed class CarouselSlidesController : ControllerBase
{
    private readonly GatewayDbContext _db;

    public CarouselSlidesController(GatewayDbContext db)
    {
        _db = db;
    }

    /// <summary>Slaytları sırayla listeler — herkese açık. <paramref name="activeOnly"/> varsayılan true (anasayfa),
    /// admin ekranı false vererek pasifleri de görür.</summary>
    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<List<CarouselSlideDto>>> List([FromQuery] bool activeOnly, CancellationToken cancellationToken)
    {
        var query = _db.CarouselSlides.AsQueryable();
        if (activeOnly)
        {
            query = query.Where(c => c.IsActive);
        }

        var items = await query.OrderBy(c => c.SortOrder).ToListAsync(cancellationToken);
        return Ok(items.Select(CarouselSlideDto.From).ToList());
    }

    /// <summary>Yeni bir slayt oluşturur — yalnızca Admin/SuperAdmin.</summary>
    [HttpPost]
    public async Task<ActionResult<CarouselSlideDto>> Create(SaveCarouselSlideRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (!AdminAuth.IsStaffAdmin(User))
        {
            return Forbid();
        }

        var entity = new CarouselSlide
        {
            ImageUrl = request.ImageUrl,
            Eyebrow = request.Eyebrow,
            Title = request.Title,
            Description = request.Description,
            LinkUrl = request.LinkUrl,
            ButtonLabel = request.ButtonLabel,
            BackgroundType = request.BackgroundType,
            BackgroundColor = request.BackgroundColor,
            BackgroundImageUrl = request.BackgroundImageUrl,
            SortOrder = request.SortOrder,
            IsActive = request.IsActive,
        };
        _db.CarouselSlides.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(List), new { }, CarouselSlideDto.From(entity));
    }

    /// <summary>Var olan bir slaytı günceller — yalnızca Admin/SuperAdmin.</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, SaveCarouselSlideRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (!AdminAuth.IsStaffAdmin(User))
        {
            return Forbid();
        }

        var entity = await _db.CarouselSlides.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (entity is null)
        {
            return NotFound();
        }

        entity.ImageUrl = request.ImageUrl;
        entity.Eyebrow = request.Eyebrow;
        entity.Title = request.Title;
        entity.Description = request.Description;
        entity.LinkUrl = request.LinkUrl;
        entity.ButtonLabel = request.ButtonLabel;
        entity.BackgroundType = request.BackgroundType;
        entity.BackgroundColor = request.BackgroundColor;
        entity.BackgroundImageUrl = request.BackgroundImageUrl;
        entity.SortOrder = request.SortOrder;
        entity.IsActive = request.IsActive;
        await _db.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    /// <summary>Bir slaytı siler — yalnızca Admin/SuperAdmin.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (!AdminAuth.IsStaffAdmin(User))
        {
            return Forbid();
        }

        var entity = await _db.CarouselSlides.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (entity is null)
        {
            return NotFound();
        }

        _db.CarouselSlides.Remove(entity);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}

public sealed record CarouselSlideDto(
    Guid Id,
    string ImageUrl,
    string? Eyebrow,
    string? Title,
    string? Description,
    string? LinkUrl,
    string? ButtonLabel,
    string BackgroundType,
    string? BackgroundColor,
    string? BackgroundImageUrl,
    int SortOrder,
    bool IsActive)
{
    public static CarouselSlideDto From(CarouselSlide entity) => new(
        entity.Id,
        entity.ImageUrl,
        entity.Eyebrow,
        entity.Title,
        entity.Description,
        entity.LinkUrl,
        entity.ButtonLabel,
        entity.BackgroundType,
        entity.BackgroundColor,
        entity.BackgroundImageUrl,
        entity.SortOrder,
        entity.IsActive);
}

public sealed record SaveCarouselSlideRequest(
    string ImageUrl,
    string? Eyebrow,
    string? Title,
    string? Description,
    string? LinkUrl,
    string? ButtonLabel,
    string BackgroundType,
    string? BackgroundColor,
    string? BackgroundImageUrl,
    int SortOrder,
    bool IsActive);
