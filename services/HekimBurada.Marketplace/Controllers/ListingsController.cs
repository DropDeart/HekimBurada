using BaseForge.API.Controllers;
using BaseForge.Core.CQRS;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Marketplace.Features.Listings;

namespace Marketplace.Controllers;

/// <summary>Listing CRUD uçları.</summary>
[Authorize]
[Route("api/[controller]")]
public sealed class ListingsController : BaseController
{
    /// <summary>Kimliğe göre tek bir Listing getirir.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ListingDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetListingByIdQuery { Id = id }, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    /// <summary>Listing kayıtlarını sayfalı listeler (query string: page, pageSize, sortBy, search).</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<ListingDto>>> List([FromQuery] ListListingQuery query, CancellationToken cancellationToken)
        => Ok(await Mediator.Send(query, cancellationToken));

    /// <summary>Yeni bir Listing oluşturur.</summary>
    [HttpPost]
    public async Task<ActionResult<Guid>> Create(CreateListingCommand command, CancellationToken cancellationToken)
    {
        var id = await Mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id }, id);
    }

    /// <summary>Var olan bir Listing kaydını günceller.</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateListingCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        command.Id = id;
        await Mediator.Send(command, cancellationToken);
        return NoContent();
    }

    /// <summary>Bir Listing kaydını siler.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await Mediator.Send(new DeleteListingCommand { Id = id }, cancellationToken);
        return NoContent();
    }

    /// <summary>ViewCount sayacını bir artırır (herkese açık).</summary>
    [AllowAnonymous]
    [HttpPost("{id:guid}/increment-viewcount")]
    public async Task<IActionResult> IncrementViewCount(Guid id, CancellationToken cancellationToken)
    {
        await Mediator.Send(new IncrementListingViewCountCommand { Id = id }, cancellationToken);
        return NoContent();
    }

    /// <summary>İlanı yeniden yayınlar (ExpiresAt yeniden hesaplanır, RenewCount artar) — CodeGen dışı, elle eklendi.</summary>
    [HttpPost("{id:guid}/renew")]
    public async Task<IActionResult> Renew(Guid id, CancellationToken cancellationToken)
    {
        await Mediator.Send(new RenewListingCommand { Id = id }, cancellationToken);
        return NoContent();
    }

    /// <summary>'sold'/'removed' durumundaki bir ilanı yeniden 'active'e döndürür — CodeGen dışı, elle eklendi.</summary>
    [HttpPost("{id:guid}/republish")]
    public async Task<IActionResult> Republish(Guid id, CancellationToken cancellationToken)
    {
        await Mediator.Send(new RepublishListingCommand { Id = id }, cancellationToken);
        return NoContent();
    }
}
