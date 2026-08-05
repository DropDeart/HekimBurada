using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using BaseForge.Core.Entities;

namespace Marketplace.Entities;

/// <summary>Favorite entity'si (BaseForge.CodeGen tarafından üretildi).</summary>
public sealed class Favorite : BaseEntity
{
    /// <summary>ListingId.</summary>
    public Guid ListingId { get; set; }
    /// <summary>UserId.</summary>
    public Guid UserId { get; set; }
    /// <summary>Listing (servis içi ilişki).</summary>
    public Listing? Listing { get; set; }
}
