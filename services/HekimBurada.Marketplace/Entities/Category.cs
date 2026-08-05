using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using BaseForge.Core.Entities;

namespace Marketplace.Entities;

/// <summary>Category entity'si (BaseForge.CodeGen tarafından üretildi).</summary>
public sealed class Category : BaseEntity
{
    /// <summary>Name.</summary>
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    /// <summary>
    /// ParentId. Nullable — CodeGen ilişkileri hep zorunlu (non-nullable Guid) üretiyor, ama üst
    /// seviye kategorilerin ebeveyni olmaması gerektiğinden elle nullable'a çevrildi (bkz. plan
    /// Faz F duman testinde bulundu, proje hafızasındaki BaseForge gap'lerine eklenecek).
    /// </summary>
    public Guid? ParentId { get; set; }
    /// <summary>Parent (servis içi ilişki).</summary>
    public Category? Parent { get; set; }
}
