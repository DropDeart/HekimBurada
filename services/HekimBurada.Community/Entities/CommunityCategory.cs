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
    /// <summary>Tür — Branş/Cihaz/Bölge. CodeGen dışı, elle eklendi.</summary>
    [MaxLength(30)]
    public string Kind { get; set; } = "Branş";
    /// <summary>Kısa açıklama. CodeGen dışı, elle eklendi.</summary>
    public string Description { get; set; } = string.Empty;
    /// <summary>Kapalı grup etiketi — bilgi amaçlı, gerçek bir davet/onay akışını tetiklemez.
    /// CodeGen dışı, elle eklendi.</summary>
    public bool IsClosed { get; set; } = true;
    /// <summary>Topluluk kuralları. CodeGen dışı, elle eklendi.</summary>
    public string Rules { get; set; } = string.Empty;
}
