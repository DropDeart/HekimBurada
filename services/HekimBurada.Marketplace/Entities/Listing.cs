using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using BaseForge.Core.Entities;

namespace Marketplace.Entities;

/// <summary>Listing entity'si (BaseForge.CodeGen tarafından üretildi).</summary>
public sealed class Listing : BaseEntity
{
    /// <summary>Title.</summary>
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    /// <summary>Description.</summary>
    public string Description { get; set; } = string.Empty;
    /// <summary>Condition.</summary>
    [MaxLength(50)]
    public string Condition { get; set; } = string.Empty;
    /// <summary>Price.</summary>
    public decimal? Price { get; set; }
    /// <summary>OriginalPrice.</summary>
    public decimal? OriginalPrice { get; set; }
    /// <summary>PaymentMethod.</summary>
    [MaxLength(20)]
    public string PaymentMethod { get; set; } = string.Empty;
    /// <summary>ReferansUrl.</summary>
    [MaxLength(500)]
    public string? ReferansUrl { get; set; }
    /// <summary>City.</summary>
    [MaxLength(100)]
    public string City { get; set; } = string.Empty;
    /// <summary>Images.</summary>
    [Column(TypeName = "jsonb")]
    public string Images { get; set; } = string.Empty;
    /// <summary>Status.</summary>
    [MaxLength(20)]
    public string Status { get; set; } = "draft";
    /// <summary>DurationDays.</summary>
    public int DurationDays { get; set; }
    /// <summary>PublishedAt.</summary>
    public DateTimeOffset? PublishedAt { get; set; }
    /// <summary>ExpiresAt.</summary>
    public DateTimeOffset? ExpiresAt { get; set; }
    /// <summary>RenewCount.</summary>
    public int RenewCount { get; set; } = 0;
    /// <summary>IsFeatured.</summary>
    public bool IsFeatured { get; set; } = false;
    /// <summary>ViewCount.</summary>
    public int ViewCount { get; set; } = 0;
    /// <summary>CategoryId.</summary>
    public Guid CategoryId { get; set; }
    /// <summary>SellerId.</summary>
    public Guid SellerId { get; set; }
    /// <summary>Category (servis içi ilişki).</summary>
    public Category? Category { get; set; }
}
