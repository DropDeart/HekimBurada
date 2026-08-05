using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using BaseForge.Core.Entities;

namespace Marketplace.Entities;

/// <summary>Offer entity'si (BaseForge.CodeGen tarafından üretildi).</summary>
public sealed class Offer : BaseEntity
{
    /// <summary>Amount.</summary>
    public decimal Amount { get; set; }
    /// <summary>Status.</summary>
    [MaxLength(20)]
    public string Status { get; set; } = "pending";
    /// <summary>ListingId.</summary>
    public Guid ListingId { get; set; }
    /// <summary>BuyerId.</summary>
    public Guid BuyerId { get; set; }
    /// <summary>Listing (servis içi ilişki).</summary>
    public Listing? Listing { get; set; }
}
