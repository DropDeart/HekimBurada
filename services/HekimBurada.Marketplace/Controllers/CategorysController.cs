using BaseForge.API.Controllers;
using BaseForge.Core.CQRS;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Marketplace.Authorization;
using Marketplace.Features.Categorys;

namespace Marketplace.Controllers;

/// <summary>Category CRUD uçları. Kategori ağacı sahiplik kavramı olmayan global bir taksonomi —
/// yönetimi (Create/Update/Delete) yalnızca Admin/SuperAdmin'e açık, CodeGen dışı elle eklendi.</summary>
[Authorize]
[Route("api/[controller]")]
public sealed class CategorysController : BaseController
{
    /// <summary>Kimliğe göre tek bir Category getirir.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CategoryDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetCategoryByIdQuery { Id = id }, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    /// <summary>Category kayıtlarını sayfalı listeler (query string: page, pageSize, sortBy, search).</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<CategoryDto>>> List([FromQuery] ListCategoryQuery query, CancellationToken cancellationToken)
        => Ok(await Mediator.Send(query, cancellationToken));

    /// <summary>Yeni bir Category oluşturur — CodeGen dışı: Admin/SuperAdmin şartı elle eklendi.</summary>
    [HttpPost]
    public async Task<ActionResult<Guid>> Create(CreateCategoryCommand command, CancellationToken cancellationToken)
    {
        if (!AdminAuth.IsStaffAdmin(User))
        {
            return Forbid();
        }

        var id = await Mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id }, id);
    }

    /// <summary>Var olan bir Category kaydını günceller — CodeGen dışı: Admin/SuperAdmin şartı elle eklendi.</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateCategoryCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        if (!AdminAuth.IsStaffAdmin(User))
        {
            return Forbid();
        }

        command.Id = id;
        await Mediator.Send(command, cancellationToken);
        return NoContent();
    }

    /// <summary>Bir Category kaydını siler — CodeGen dışı: Admin/SuperAdmin şartı elle eklendi.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (!AdminAuth.IsStaffAdmin(User))
        {
            return Forbid();
        }

        await Mediator.Send(new DeleteCategoryCommand { Id = id }, cancellationToken);
        return NoContent();
    }
}
