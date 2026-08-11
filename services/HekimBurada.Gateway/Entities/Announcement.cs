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
    /// <summary>AuthorId.</summary>
    public Guid AuthorId { get; set; }
}
