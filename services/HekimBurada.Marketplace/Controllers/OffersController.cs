using BaseForge.API.Controllers;
using BaseForge.Core.CQRS;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Marketplace.Authorization;
using Marketplace.Features.Listings;
using Marketplace.Features.Offers;

namespace Marketplace.Controllers;

/// <summary>Offer CRUD uçları.</summary>
[Authorize]
[Route("api/[controller]")]
public sealed class OffersController : BaseController
{
    /// <summary>Kimliğe göre tek bir Offer getirir.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<OfferDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetOfferByIdQuery { Id = id }, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    /// <summary>Offer kayıtlarını sayfalı listeler (query string: page, pageSize, sortBy, search).</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<OfferDto>>> List([FromQuery] ListOfferQuery query, CancellationToken cancellationToken)
        => Ok(await Mediator.Send(query, cancellationToken));

    /// <summary>Yeni bir Offer oluşturur — CodeGen dışı: BuyerId sahtekarlığını önlemek için
    /// çağıranın kendi kimliğiyle elle ezildi (client-supplied değerine güvenilmiyor).</summary>
    [HttpPost]
    public async Task<ActionResult<Guid>> Create(CreateOfferCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        var callerId = AdminAuth.GetUserId(User);
        if (callerId is null)
        {
            return Forbid();
        }

        command.BuyerId = callerId.Value;
        var id = await Mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id }, id);
    }

    /// <summary>
    /// Var olan bir Offer kaydını günceller — CodeGen dışı: yetki şartı elle eklendi. Bugün tek gerçek
    /// çağıran, kendi ilanına gelen teklifi kabul/red eden SATICI (bkz. ilanlar/[id]/page.tsx decideOffer);
    /// ALICI'nın kendi teklifini (henüz kararsızken) revize edebilmesi de mantıklı olduğundan izinli.
    /// </summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateOfferCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        var isAdmin = AdminAuth.IsStaffAdmin(User);
        if (!isAdmin)
        {
            var authorized = await IsBuyerSellerOrAdminAsync(id, cancellationToken);
            if (authorized == false)
            {
                return Forbid();
            }

            if (authorized == true)
            {
                // Update tüm alanları eziyor; admin olmayan çağıran BuyerId/ListingId'yi başka bir
                // alıcıya/ilana devredemesin diye ikisi de orijinal değerine sabitleniyor.
                var offer = await Mediator.Send(new GetOfferByIdQuery { Id = id }, cancellationToken);
                if (offer is not null)
                {
                    command.BuyerId = offer.BuyerId;
                    command.ListingId = offer.ListingId;
                }
            }
        }

        command.Id = id;
        await Mediator.Send(command, cancellationToken);
        return NoContent();
    }

    /// <summary>Bir Offer kaydını siler (teklifi geri çekme) — CodeGen dışı: yalnızca teklifi veren
    /// alıcı veya Admin/SuperAdmin silebilsin diye elle eklendi.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (await IsBuyerOrAdminAsync(id, cancellationToken) == false)
        {
            return Forbid();
        }

        await Mediator.Send(new DeleteOfferCommand { Id = id }, cancellationToken);
        return NoContent();
    }

    /// <summary>Çağıran; teklifin alıcısı, ilgili ilanın satıcısı ya da Admin/SuperAdmin mi? — CodeGen
    /// dışı, elle eklendi. Teklif yoksa null döner (asıl komut kendi NotFoundException'ını fırlatsın).</summary>
    private async Task<bool?> IsBuyerSellerOrAdminAsync(Guid offerId, CancellationToken cancellationToken)
    {
        if (AdminAuth.IsStaffAdmin(User))
        {
            return true;
        }

        var offer = await Mediator.Send(new GetOfferByIdQuery { Id = offerId }, cancellationToken);
        if (offer is null)
        {
            return null;
        }

        var callerId = AdminAuth.GetUserId(User);
        if (callerId is null)
        {
            return false;
        }

        if (offer.BuyerId == callerId)
        {
            return true;
        }

        var listing = await Mediator.Send(new GetListingByIdQuery { Id = offer.ListingId }, cancellationToken);
        return listing is not null && listing.SellerId == callerId;
    }

    /// <summary>Çağıran, teklifin alıcısı mı yoksa Admin/SuperAdmin mi? — CodeGen dışı, elle eklendi.
    /// Teklif yoksa null döner (asıl komut kendi NotFoundException'ını fırlatsın).</summary>
    private async Task<bool?> IsBuyerOrAdminAsync(Guid offerId, CancellationToken cancellationToken)
    {
        if (AdminAuth.IsStaffAdmin(User))
        {
            return true;
        }

        var offer = await Mediator.Send(new GetOfferByIdQuery { Id = offerId }, cancellationToken);
        if (offer is null)
        {
            return null;
        }

        var callerId = AdminAuth.GetUserId(User);
        return callerId is not null && offer.BuyerId == callerId;
    }
}
