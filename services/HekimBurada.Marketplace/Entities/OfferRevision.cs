using System.ComponentModel.DataAnnotations;
using BaseForge.Core.Entities;

namespace Marketplace.Entities;

/// <summary>
/// Bir Offer'ın (ilan teklifi) geçmişindeki tek bir olay — ilk teklif, tutar revizyonu veya durum
/// değişikliği (kabul/red). Mesajlaşma ekranındaki "Teklif geçmişi" listesi için — CodeGen dışı,
/// elle eklendi (bkz. proje kararı).
/// </summary>
public sealed class OfferRevision : BaseEntity
{
    public Guid OfferId { get; set; }
    public decimal Amount { get; set; }
    /// <summary>Null ise düz teklif/revizyon, doluysa bir durum değişikliği notu (ör. "kabul edildi").</summary>
    [MaxLength(50)]
    public string? Note { get; set; }
}
