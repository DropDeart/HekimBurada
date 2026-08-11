using BaseForge.API.Controllers;
using BaseForge.Core.CQRS;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Marketplace.Authorization;
using Marketplace.Features.ListingReviews;

namespace Marketplace.Controllers;

/// <summary>İlan yorum/değerlendirme uçları. CodeGen dışı, elle eklendi.</summary>
[Authorize]
[Route("api/listing-reviews")]
public sealed class ListingReviewsController : BaseController
{
    /// <summary>Yorumları sayfalı listeler — herkese açık. <c>listingId</c> ile filtrelenir.</summary>
    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<PagedResult<ListingReviewDto>>> List([FromQuery] ListListingReviewQuery query, CancellationToken cancellationToken)
        => Ok(await Mediator.Send(query, cancellationToken));

    /// <summary>Yeni bir yorum ekler — herhangi bir giriş yapmış kullanıcı. AuthorId çağıranın kendi
    /// kimliğiyle ezilir (client-supplied değerine güvenilmiyor).</summary>
    [HttpPost]
    public async Task<ActionResult<Guid>> Create(CreateListingReviewCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        var callerId = AdminAuth.GetUserId(User);
        if (callerId is null)
        {
            return Forbid();
        }

        command.AuthorId = callerId.Value;
        var id = await Mediator.Send(command, cancellationToken);
        return Ok(id);
    }

    /// <summary>Bir yorumu siler — yazarı ya da Admin/SuperAdmin.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        // Not: yazar kontrolü için yorumun kendisini çekecek bir GetById ucu yok (ihtiyaç yok) —
        // admin değilse ve kendi yorumu değilse silme isteği DeleteListingReviewHandler'ın
        // NotFoundException'ı üzerinden değil, burada engellenmeli. Basitlik için şimdilik sadece
        // Admin/SuperAdmin silebiliyor (moderasyon amaçlı) — kullanıcı kendi yorumunu silme talebi
        // gelirse ayrıca eklenir.
        if (!AdminAuth.IsStaffAdmin(User))
        {
            return Forbid();
        }

        await Mediator.Send(new DeleteListingReviewCommand { Id = id }, cancellationToken);
        return NoContent();
    }
}
