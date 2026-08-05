using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using BaseForge.Core.Entities;

namespace Community.Entities;

/// <summary>CommunityCategory entity'si (BaseForge.CodeGen tarafından üretildi).</summary>
public sealed class CommunityCategory : BaseEntity
{
    /// <summary>Name.</summary>
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
}
