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
    /// Bu kategoride verilecek ilanların formu: "product" (durum+fiyat+ödeme yöntemi — mevcut
    /// davranış), "big_ticket" (konut/araba gibi — sadece fiyat, ödeme yöntemi sabit "elden"),
    /// "job" (iş ilanı gibi — fiyat/ödeme/durum hiç yok, düz ilan). CodeGen dışı, elle eklendi —
    /// ilan-ver sihirbazı adımlarını buna göre gösterir/gizler (bkz. ilan-ver/page.tsx).
    /// </summary>
    [MaxLength(20)]
    public string ListingKind { get; set; } = "product";
    /// <summary>
    /// ParentId. Nullable — CodeGen ilişkileri hep zorunlu (non-nullable Guid) üretiyor, ama üst
    /// seviye kategorilerin ebeveyni olmaması gerektiğinden elle nullable'a çevrildi (bkz. plan
    /// Faz F duman testinde bulundu, proje hafızasındaki BaseForge gap'lerine eklenecek).
    /// </summary>
    public Guid? ParentId { get; set; }
    /// <summary>Parent (servis içi ilişki).</summary>
    public Category? Parent { get; set; }
}
