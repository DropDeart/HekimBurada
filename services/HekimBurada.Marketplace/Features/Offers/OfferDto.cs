using Marketplace.Entities;

namespace Marketplace.Features.Offers;

/// <summary>Offer veri transfer nesnesi.</summary>
public sealed class OfferDto
{
    /// <summary>Kayıt kimliği.</summary>
    public Guid Id { get; set; }
    /// <summary>Amount.</summary>
    public decimal Amount { get; set; }
    /// <summary>Status.</summary>
    public string Status { get; set; } = "pending";
    /// <summary>ListingId.</summary>
    public Guid ListingId { get; set; }
    /// <summary>BuyerId.</summary>
    public Guid BuyerId { get; set; }

    /// <summary>Bir Offer entity'sinden DTO üretir.</summary>
    public static OfferDto From(Offer entity)
    {
        ArgumentNullException.ThrowIfNull(entity);
        return new OfferDto
        {
            Id = entity.Id,
            Amount = entity.Amount,
            Status = entity.Status,
            ListingId = entity.ListingId,
            BuyerId = entity.BuyerId,
        };
    }
}
