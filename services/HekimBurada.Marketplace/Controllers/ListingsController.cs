using BaseForge.API.Controllers;
using BaseForge.Core.CQRS;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Marketplace.Authorization;
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

    /// <summary>Yeni bir Listing oluşturur — CodeGen dışı: SellerId sahtekarlığını önlemek için
    /// çağıranın kendi kimliğiyle elle ezildi (client-supplied değerine güvenilmiyor).</summary>
    [HttpPost]
    public async Task<ActionResult<Guid>> Create(CreateListingCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        var callerId = AdminAuth.GetUserId(User);
        if (callerId is null)
        {
            return Forbid();
        }

        command.SellerId = callerId.Value;
        var id = await Mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id }, id);
    }

    /// <summary>Var olan bir Listing kaydını günceller — CodeGen dışı: sahip/admin şartı elle eklendi.
    /// Update komutu tüm alanları eziyor; admin olmayan çağıran SellerId'yi başkasına devredemesin diye
    /// alan orijinal değerine sabitleniyor.</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateListingCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        var isAdmin = AdminAuth.IsStaffAdmin(User);
        if (!isAdmin)
        {
            var listing = await Mediator.Send(new GetListingByIdQuery { Id = id }, cancellationToken);
            if (listing is not null)
            {
                var callerId = AdminAuth.GetUserId(User);
                if (callerId is null || listing.SellerId != callerId)
                {
                    return Forbid();
                }

                command.SellerId = listing.SellerId;
            }
        }

        command.Id = id;
        await Mediator.Send(command, cancellationToken);
        return NoContent();
    }

    /// <summary>Bir Listing kaydını siler — CodeGen dışı: sahip/admin şartı elle eklendi.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (await IsOwnerOrAdminAsync(id, cancellationToken) == false)
        {
            return Forbid();
        }

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

    /// <summary>İlanı yeniden yayınlar (ExpiresAt yeniden hesaplanır, RenewCount artar) — CodeGen dışı,
    /// elle eklendi (sahip/admin şartı da elle eklendi).</summary>
    [HttpPost("{id:guid}/renew")]
    public async Task<IActionResult> Renew(Guid id, CancellationToken cancellationToken)
    {
        if (await IsOwnerOrAdminAsync(id, cancellationToken) == false)
        {
            return Forbid();
        }

        await Mediator.Send(new RenewListingCommand { Id = id }, cancellationToken);
        return NoContent();
    }

    /// <summary>'sold'/'removed' durumundaki bir ilanı yeniden 'active'e döndürür — CodeGen dışı,
    /// elle eklendi (sahip/admin şartı da elle eklendi).</summary>
    [HttpPost("{id:guid}/republish")]
    public async Task<IActionResult> Republish(Guid id, CancellationToken cancellationToken)
    {
        if (await IsOwnerOrAdminAsync(id, cancellationToken) == false)
        {
            return Forbid();
        }

        await Mediator.Send(new RepublishListingCommand { Id = id }, cancellationToken);
        return NoContent();
    }

    /// <summary>'pending' bir ilanı onaylar (yayına alır) — yalnızca Admin/SuperAdmin, CodeGen dışı elle eklendi.</summary>
    [HttpPost("{id:guid}/approve")]
    public async Task<IActionResult> Approve(Guid id, CancellationToken cancellationToken)
    {
        if (!AdminAuth.IsStaffAdmin(User))
        {
            return Forbid();
        }

        await Mediator.Send(new ApproveListingCommand { Id = id }, cancellationToken);
        return NoContent();
    }

    /// <summary>'pending' bir ilanı reddeder (hiç yayına girmez) — yalnızca Admin/SuperAdmin, CodeGen dışı elle eklendi.</summary>
    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid id, CancellationToken cancellationToken)
    {
        if (!AdminAuth.IsStaffAdmin(User))
        {
            return Forbid();
        }

        await Mediator.Send(new RejectListingCommand { Id = id }, cancellationToken);
        return NoContent();
    }

    /// <summary>
    /// Çağıran, ilanın sahibi mi (SellerId) yoksa Admin/SuperAdmin mi? — CodeGen dışı, elle eklendi.
    /// İlan yoksa null döner (asıl komut kendi NotFoundException'ını fırlatsın diye 404 burada taklit
    /// edilmiyor).
    /// </summary>
    private async Task<bool?> IsOwnerOrAdminAsync(Guid listingId, CancellationToken cancellationToken)
    {
        if (AdminAuth.IsStaffAdmin(User))
        {
            return true;
        }

        var listing = await Mediator.Send(new GetListingByIdQuery { Id = listingId }, cancellationToken);
        if (listing is null)
        {
            return null;
        }

        var callerId = AdminAuth.GetUserId(User);
        return callerId is not null && listing.SellerId == callerId;
    }
}
