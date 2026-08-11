using BaseForge.API.Controllers;
using BaseForge.Core.CQRS;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Marketplace.Authorization;
using Marketplace.Features.Requests;
using Marketplace.Features.RequestOffers;

namespace Marketplace.Controllers;

/// <summary>
/// Bir Talebe verilen karşılık tekliflerinin uçları — Offer/Listing ile aynı desen (bkz.
/// OffersController). Kabul edilen bir RequestOffer'ın sohbeti, Messaging servisindeki mevcut
/// Message/OfferId mekanizmasını RequestOffer.Id ile aynen kullanır — Messaging'de bu alan opak
/// bir grup anahtarı olduğundan (bkz. Message.cs/MessageHub.cs doc yorumları) ek bir servis
/// değişikliği gerekmedi. CodeGen dışı, elle eklendi.
/// </summary>
[Authorize]
[Route("api/request-offers")]
public sealed class RequestOffersController : BaseController
{
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<RequestOfferDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetRequestOfferByIdQuery { Id = id }, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<RequestOfferDto>>> List([FromQuery] ListRequestOfferQuery query, CancellationToken cancellationToken)
        => Ok(await Mediator.Send(query, cancellationToken));

    /// <summary>Yeni bir teklif oluşturur — ResponderId sahtekarlığını önlemek için çağıranın kendi
    /// kimliğiyle ezilir.</summary>
    [HttpPost]
    public async Task<ActionResult<Guid>> Create(CreateRequestOfferCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        var callerId = AdminAuth.GetUserId(User);
        if (callerId is null)
        {
            return Forbid();
        }

        command.ResponderId = callerId.Value;
        var id = await Mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id }, id);
    }

    /// <summary>Teklifi kabul/red eden talep sahibi ya da kendi teklifini revize eden yanıtlayan
    /// çağırabilir (bkz. OffersController.Update ile aynı yetki deseni).</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateRequestOfferCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        var isAdmin = AdminAuth.IsStaffAdmin(User);
        if (!isAdmin)
        {
            var authorized = await IsResponderRequesterOrAdminAsync(id, cancellationToken);
            if (authorized == false)
            {
                return Forbid();
            }

            if (authorized == true)
            {
                var offer = await Mediator.Send(new GetRequestOfferByIdQuery { Id = id }, cancellationToken);
                if (offer is not null)
                {
                    command.ResponderId = offer.ResponderId;
                    command.RequestId = offer.RequestId;
                }
            }
        }

        command.Id = id;
        await Mediator.Send(command, cancellationToken);
        return NoContent();
    }

    /// <summary>Bir teklifi siler (geri çekme) — yalnızca yanıtlayan veya Admin/SuperAdmin.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (await IsResponderOrAdminAsync(id, cancellationToken) == false)
        {
            return Forbid();
        }

        await Mediator.Send(new DeleteRequestOfferCommand { Id = id }, cancellationToken);
        return NoContent();
    }

    private async Task<bool?> IsResponderRequesterOrAdminAsync(Guid requestOfferId, CancellationToken cancellationToken)
    {
        if (AdminAuth.IsStaffAdmin(User))
        {
            return true;
        }

        var offer = await Mediator.Send(new GetRequestOfferByIdQuery { Id = requestOfferId }, cancellationToken);
        if (offer is null)
        {
            return null;
        }

        var callerId = AdminAuth.GetUserId(User);
        if (callerId is null)
        {
            return false;
        }

        if (offer.ResponderId == callerId)
        {
            return true;
        }

        var req = await Mediator.Send(new GetRequestByIdQuery { Id = offer.RequestId }, cancellationToken);
        return req is not null && req.RequesterId == callerId;
    }

    private async Task<bool?> IsResponderOrAdminAsync(Guid requestOfferId, CancellationToken cancellationToken)
    {
        if (AdminAuth.IsStaffAdmin(User))
        {
            return true;
        }

        var offer = await Mediator.Send(new GetRequestOfferByIdQuery { Id = requestOfferId }, cancellationToken);
        if (offer is null)
        {
            return null;
        }

        var callerId = AdminAuth.GetUserId(User);
        return callerId is not null && offer.ResponderId == callerId;
    }
}
