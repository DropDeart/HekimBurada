using System.ComponentModel.DataAnnotations;
using BaseForge.Core.Entities;

namespace Gateway.Entities;

/// <summary>Anasayfa hero carousel'inde gösterilen bir slayt (CodeGen dışı, elle eklendi).</summary>
public sealed class CarouselSlide : BaseEntity
{
    [MaxLength(500)]
    public string ImageUrl { get; set; } = string.Empty;

    /// <summary>Başlığın üstünde gösterilen küçük, büyük harfli etiket (ör. "GÜVENİLİR PAZAR YERİ") —
    /// boşsa frontend'in varsayılan metnini kullanır.</summary>
    [MaxLength(60)]
    public string? Eyebrow { get; set; }

    [MaxLength(200)]
    public string? Title { get; set; }

    /// <summary>Zengin metin editöründen (bkz. frontend RichTextEditor) gelen HTML — anasayfa hero'sunda
    /// olduğu gibi (dangerouslySetInnerHTML) render edilir. Kaynak sadece Admin/SuperAdmin'e açık
    /// olduğundan (kullanıcı üretimi içerik değil) sanitize edilmiyor.</summary>
    public string? Description { get; set; }

    [MaxLength(500)]
    public string? LinkUrl { get; set; }

    /// <summary>CTA buton metni — boşsa frontend "İlanlara Göz At" varsayılanını kullanır.</summary>
    [MaxLength(50)]
    public string? ButtonLabel { get; set; }

    /// <summary>"color" veya "image" — hero section'ın arka planının nasıl render edileceğini belirler.
    /// Boşsa/tanınmıyorsa frontend "color" varsayar.</summary>
    [MaxLength(20)]
    public string BackgroundType { get; set; } = "color";

    /// <summary>Hero section'ın arka plan rengi (hex, ör. "#141718") — BackgroundType "color" iken kullanılır,
    /// boşsa frontend'in varsayılan koyu arka planı kullanılır.</summary>
    [MaxLength(20)]
    public string? BackgroundColor { get; set; }

    /// <summary>Hero section'ın tam kaplayan arka plan görseli — BackgroundType "image" iken kullanılır.
    /// Sağdaki küçük kutu görseli olan <see cref="ImageUrl"/>'den bağımsız, ayrı bir görsel.</summary>
    [MaxLength(500)]
    public string? BackgroundImageUrl { get; set; }

    public int SortOrder { get; set; }

    public bool IsActive { get; set; } = true;
}
