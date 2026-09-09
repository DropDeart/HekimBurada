using Marketplace.Entities;

namespace Marketplace.Features.RequestOffers;

/// <summary>RequestOfferRevision veri transfer nesnesi — CodeGen dışı, elle eklendi.</summary>
public sealed class RequestOfferRevisionDto
{
    public Guid Id { get; set; }
    public decimal Amount { get; set; }
    public string? Note { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public static RequestOfferRevisionDto From(RequestOfferRevision entity) => new()
    {
        Id = entity.Id,
        Amount = entity.Amount,
        Note = entity.Note,
        CreatedAt = entity.CreatedAt,
    };
}
