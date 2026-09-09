using System.ComponentModel.DataAnnotations;
using BaseForge.Core.Entities;

namespace Marketplace.Entities;

/// <summary>
/// Bir RequestOffer'ın (talep karşılık teklifi) geçmişindeki tek bir olay — bkz. OfferRevision
/// doc yorumu, aynı gerekçeyle talep teklifleri için ayrı tutulur. CodeGen dışı, elle eklendi.
/// </summary>
public sealed class RequestOfferRevision : BaseEntity
{
    public Guid RequestOfferId { get; set; }
    public decimal Amount { get; set; }
    [MaxLength(50)]
    public string? Note { get; set; }
}
