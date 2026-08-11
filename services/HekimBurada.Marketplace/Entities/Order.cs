using System.ComponentModel.DataAnnotations;
using BaseForge.Core.Entities;

namespace Marketplace.Entities;

/// <summary>
/// Bir ilan için oluşturulan sipariş kaydı (CodeGen dışı, elle eklendi). Ödeme yöntemine göre yalnızca
/// ilgili alanlar doldurulur (ör. "kart" için hiçbiri — kart bilgisi güvenlik nedeniyle asla toplanmıyor/
/// saklanmıyor, bkz. OrdersController). Status şu an yalnızca bilgi amaçlı "pending" ile başlar — bu
/// kapsamda satıcı/admin'in siparişi "tamamlandı" olarak işaretleyeceği bir uç yok, takip mevcut
/// teklif/sohbet sistemi üzerinden yapılır.
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
}
