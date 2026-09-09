using System.ComponentModel.DataAnnotations;
using BaseForge.Core.Entities;

namespace Marketplace.Entities;

/// <summary>
/// Bir ilan için oluşturulan sipariş kaydı (CodeGen dışı, elle eklendi). Ödeme yöntemine göre yalnızca
/// ilgili alanlar doldurulur (ör. "kart" için hiçbiri — kart bilgisi güvenlik nedeniyle asla toplanmıyor/
/// saklanmıyor, bkz. OrdersController). Status "pending" ile başlar, satıcı kargo bilgisiyle "shipped"
/// yapabilir (kargo adımı atlanıp doğrudan "delivered" da işaretlenebilir — ör. elden teslimde kargo
/// yok), "delivered"ı hem alıcı hem satıcı işaretleyebilir (bkz. ShipOrderCommand/DeliverOrderCommand).
/// </summary>
public sealed class Order : BaseEntity
{
    public Guid ListingId { get; set; }

    public Guid BuyerId { get; set; }

    public Guid SellerId { get; set; }

    /// <summary>bagis | bedelsiz | referans | kart | elden.</summary>
    [MaxLength(20)]
    public string PaymentMethod { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    /// <summary>pending | shipped | delivered.</summary>
    [MaxLength(20)]
    public string Status { get; set; } = "pending";

    /// <summary>"bagis" — bağış yapılan kuruluş adı.</summary>
    [MaxLength(200)]
    public string? DonationOrganization { get; set; }

    /// <summary>"bagis" — yüklenen bağış dekontu.</summary>
    [MaxLength(500)]
    public string? DonationReceiptUrl { get; set; }

    /// <summary>"referans" — alıcının paylaştığı referans/satın alma linki.</summary>
    [MaxLength(500)]
    public string? BuyerReferansUrl { get; set; }

    /// <summary>"elden" — teslim yeri/notu.</summary>
    [MaxLength(500)]
    public string? DeliveryNote { get; set; }

    /// <summary>Kargoya verilirken satıcının girdiği kargo firması (ör. "Yurtiçi Kargo") — opsiyonel.</summary>
    [MaxLength(100)]
    public string? ShippingCarrier { get; set; }

    /// <summary>Kargoya verilirken satıcının girdiği takip numarası — opsiyonel.</summary>
    [MaxLength(100)]
    public string? TrackingNumber { get; set; }

    public DateTimeOffset? ShippedAt { get; set; }

    public DateTimeOffset? DeliveredAt { get; set; }
}
