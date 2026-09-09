using Marketplace.Entities;

namespace Marketplace.Features.Offers;

/// <summary>OfferRevision veri transfer nesnesi — CodeGen dışı, elle eklendi.</summary>
public sealed class OfferRevisionDto
{
    public Guid Id { get; set; }
    public decimal Amount { get; set; }
    public string? Note { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public static OfferRevisionDto From(OfferRevision entity) => new()
    {
        Id = entity.Id,
        Amount = entity.Amount,
        Note = entity.Note,
        CreatedAt = entity.CreatedAt,
    };
}
