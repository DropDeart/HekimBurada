using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using BaseForge.Core.Entities;

namespace Community.Entities;

/// <summary>Topic entity'si (BaseForge.CodeGen tarafından üretildi).</summary>
public sealed class Topic : BaseEntity
{
    /// <summary>Title.</summary>
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    /// <summary>Body.</summary>
    public string Body { get; set; } = string.Empty;
    /// <summary>ViewCount.</summary>
    public int ViewCount { get; set; } = 0;
    /// <summary>IsPinned.</summary>
    public bool IsPinned { get; set; } = false;
    /// <summary>IsLocked.</summary>
    public bool IsLocked { get; set; } = false;
    /// <summary>CategoryId.</summary>
    public Guid CategoryId { get; set; }
    /// <summary>AuthorId.</summary>
    public Guid AuthorId { get; set; }
    /// <summary>Category (servis içi ilişki).</summary>
    public CommunityCategory? Category { get; set; }
}
