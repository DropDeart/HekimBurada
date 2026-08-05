using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using BaseForge.Core.Entities;

namespace Marketplace.Entities;

/// <summary>Request entity'si (BaseForge.CodeGen tarafından üretildi).</summary>
public sealed class Request : BaseEntity
{
    /// <summary>Title.</summary>
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    /// <summary>Description.</summary>
    public string Description { get; set; } = string.Empty;
    /// <summary>BudgetMax.</summary>
    public decimal? BudgetMax { get; set; }
    /// <summary>Status.</summary>
    [MaxLength(20)]
    public string Status { get; set; } = "open";
    /// <summary>CategoryId.</summary>
    public Guid CategoryId { get; set; }
    /// <summary>RequesterId.</summary>
    public Guid RequesterId { get; set; }
    /// <summary>Category (servis içi ilişki).</summary>
    public Category? Category { get; set; }
}
