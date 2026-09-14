using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using BaseForge.Core.Entities;

namespace Gateway.Entities;

/// <summary>Announcement entity'si (BaseForge.CodeGen tarafından üretildi).</summary>
public sealed class Announcement : BaseEntity
{
    /// <summary>Title.</summary>
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    /// <summary>Body.</summary>
    public string Body { get; set; } = string.Empty;

    /// <summary>Duyuru görseli — CodeGen dışı, elle eklendi. Boşsa duyuru panosu/navbar/popup görselsiz render eder.</summary>
    [MaxLength(500)]
    public string? ImageUrl { get; set; }

    /// <summary>PublishedAt.</summary>
    public DateTimeOffset PublishedAt { get; set; }

    /// <summary>Duyurunun navbar/popup'ta otomatik gizleneceği tarih — CodeGen dışı, elle eklendi.
    /// Boşsa süresiz gösterilir. "Duyuru Panosu" (tüm duyurular arşivi) bundan etkilenmez, yalnızca
    /// navbar'daki üst şerit ve giriş popup'ı bu alana bakar (bkz. proje kararı).</summary>
    public DateTimeOffset? ExpiresAt { get; set; }

    /// <summary>AuthorId.</summary>
    public Guid AuthorId { get; set; }
}
