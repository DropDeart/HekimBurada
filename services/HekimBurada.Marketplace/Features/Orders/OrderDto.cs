using Marketplace.Entities;

namespace Marketplace.Features.Orders;

/// <summary>Order veri transfer nesnesi — CodeGen dışı, elle eklendi.</summary>
public sealed class OrderDto
{
    public Guid Id { get; set; }
    public Guid ListingId { get; set; }
    public Guid BuyerId { get; set; }
    public Guid SellerId { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? DonationOrganization { get; set; }
    public string? DonationReceiptUrl { get; set; }
    public string? BuyerReferansUrl { get; set; }
    public string? DeliveryNote { get; set; }
    public string? ShippingCarrier { get; set; }
    public string? TrackingNumber { get; set; }
    public DateTimeOffset? ShippedAt { get; set; }
    public DateTimeOffset? DeliveredAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public static OrderDto From(Order entity)
    {
        ArgumentNullException.ThrowIfNull(entity);
        return new OrderDto
        {
            Id = entity.Id,
            ListingId = entity.ListingId,
            BuyerId = entity.BuyerId,
            SellerId = entity.SellerId,
            PaymentMethod = entity.PaymentMethod,
            Amount = entity.Amount,
            Status = entity.Status,
            DonationOrganization = entity.DonationOrganization,
            DonationReceiptUrl = entity.DonationReceiptUrl,
            BuyerReferansUrl = entity.BuyerReferansUrl,
            DeliveryNote = entity.DeliveryNote,
            ShippingCarrier = entity.ShippingCarrier,
            TrackingNumber = entity.TrackingNumber,
            ShippedAt = entity.ShippedAt,
            DeliveredAt = entity.DeliveredAt,
            CreatedAt = entity.CreatedAt,
        };
    }
}
