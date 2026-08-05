using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using BaseForge.Core.Entities;

namespace Community.Entities;

/// <summary>Membership entity'si (BaseForge.CodeGen tarafından üretildi).</summary>
public sealed class Membership : BaseEntity
{
    /// <summary>AutoJoined.</summary>
    public bool AutoJoined { get; set; } = true;
    /// <summary>CategoryId.</summary>
    public Guid CategoryId { get; set; }
    /// <summary>UserId.</summary>
    public Guid UserId { get; set; }
    /// <summary>Category (servis içi ilişki).</summary>
    public CommunityCategory? Category { get; set; }
}
