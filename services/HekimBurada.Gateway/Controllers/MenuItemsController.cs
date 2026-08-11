using Gateway.Authorization;
using Gateway.Data;
using Gateway.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Gateway.Controllers;

/// <summary>Header/Footer navigasyon linkleri CRUD'u. CodeGen dışı, elle eklendi.</summary>
[ApiController]
[Authorize]
[Route("api/menu-items")]
public sealed class MenuItemsController : ControllerBase
{
    private readonly GatewayDbContext _db;

    public MenuItemsController(GatewayDbContext db)
    {
        _db = db;
    }

    /// <summary>Menü linklerini listeler — herkese açık. <paramref name="location"/> verilirse o slota göre filtreler.</summary>
    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<List<MenuItemDto>>> List([FromQuery] string? location, CancellationToken cancellationToken)
    {
        var query = _db.MenuItems.AsQueryable();
        if (!string.IsNullOrWhiteSpace(location))
        {
            query = query.Where(m => m.Location == location);
        }

        var items = await query.OrderBy(m => m.SortOrder).ToListAsync(cancellationToken);
        return Ok(items.Select(MenuItemDto.From).ToList());
    }

    /// <summary>Yeni bir menü linki oluşturur — yalnızca Admin/SuperAdmin.</summary>
    [HttpPost]
    public async Task<ActionResult<MenuItemDto>> Create(SaveMenuItemRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (!AdminAuth.IsStaffAdmin(User))
        {
            return Forbid();
        }

        if (!MenuItemLocations.All.Contains(request.Location))
        {
            return BadRequest(new { error = "Geçersiz konum." });
        }

        var entity = new MenuItem
        {
            Location = request.Location,
            Label = request.Label,
            Url = request.Url,
            SortOrder = request.SortOrder,
        };
        _db.MenuItems.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(List), new { }, MenuItemDto.From(entity));
    }

    /// <summary>Var olan bir menü linkini günceller — yalnızca Admin/SuperAdmin.</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, SaveMenuItemRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (!AdminAuth.IsStaffAdmin(User))
        {
            return Forbid();
        }

        if (!MenuItemLocations.All.Contains(request.Location))
        {
            return BadRequest(new { error = "Geçersiz konum." });
        }

        var entity = await _db.MenuItems.FirstOrDefaultAsync(m => m.Id == id, cancellationToken);
        if (entity is null)
        {
            return NotFound();
        }

        entity.Location = request.Location;
        entity.Label = request.Label;
        entity.Url = request.Url;
        entity.SortOrder = request.SortOrder;
        await _db.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    /// <summary>Bir menü linkini siler — yalnızca Admin/SuperAdmin.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (!AdminAuth.IsStaffAdmin(User))
        {
            return Forbid();
        }

        var entity = await _db.MenuItems.FirstOrDefaultAsync(m => m.Id == id, cancellationToken);
        if (entity is null)
        {
            return NotFound();
        }

        _db.MenuItems.Remove(entity);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}

public sealed record MenuItemDto(Guid Id, string Location, string Label, string Url, int SortOrder)
{
    public static MenuItemDto From(MenuItem entity) => new(entity.Id, entity.Location, entity.Label, entity.Url, entity.SortOrder);
}

public sealed record SaveMenuItemRequest(string Location, string Label, string Url, int SortOrder);
