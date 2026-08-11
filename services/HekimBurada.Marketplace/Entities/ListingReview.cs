using System.ComponentModel.DataAnnotations;
using BaseForge.Core.Entities;

namespace Marketplace.Entities;

/// <summary>İlan detay sayfasındaki yorum/değerlendirme (CodeGen dışı, elle eklendi).</summary>
public sealed class ListingReview : BaseEntity
{
    public Guid ListingId { get; set; }

    public Guid AuthorId { get; set; }

    /// <summary>1-5 arası yıldız.</summary>
    public int Rating { get; set; }

    public string Body { get; set; } = string.Empty;
}
