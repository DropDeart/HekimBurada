using System.ComponentModel.DataAnnotations;
using BaseForge.Core.Entities;

namespace Marketplace.Entities;

/// <summary>
/// Bir Talep'e (Request) verilen karşılık teklifi — Offer/Listing ikilisiyle aynı ilişkiyi
/// Request tarafında kurar. CodeGen dışı, elle eklendi. Sohbet Messaging servisindeki mevcut
/// Message/OfferId mekanizmasını aynen kullanır (bkz. RequestOffersController doc yorumu) —
/// Messaging'de OfferId gerçekte opak bir grup anahtarı, gerçek bir Offer'a referans zorunluluğu
/// yok, bu yüzden RequestOffer.Id de aynı alanda taşınabiliyor.
/// </summary>
public sealed class RequestOffer : BaseEntity
{
    public decimal Amount { get; set; }

    [MaxLength(20)]
    public string Status { get; set; } = "pending";

    public Guid RequestId { get; set; }

    /// <summary>Talebi karşılamayı teklif eden kullanıcı.</summary>
    public Guid ResponderId { get; set; }

    public Request? Request { get; set; }
}
