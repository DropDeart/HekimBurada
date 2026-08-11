using Marketplace.Entities;

namespace Marketplace.Features.RequestOffers;

/// <summary>RequestOffer veri transfer nesnesi — CodeGen dışı, elle eklendi.</summary>
public sealed class RequestOfferDto
{
    public Guid Id { get; set; }
    public decimal Amount { get; set; }
    public string Status { get; set; } = "pending";
    public Guid RequestId { get; set; }
    public Guid ResponderId { get; set; }

    public static RequestOfferDto From(RequestOffer entity)
    {
        ArgumentNullException.ThrowIfNull(entity);
        return new RequestOfferDto
        {
            Id = entity.Id,
            Amount = entity.Amount,
            Status = entity.Status,
            RequestId = entity.RequestId,
            ResponderId = entity.ResponderId,
        };
    }
}
