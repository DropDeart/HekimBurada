using System.ComponentModel.DataAnnotations;
using BaseForge.Core.Entities;

namespace Gateway.Entities;

/// <summary>
/// Site geneli ayarlar — tek satırlık singleton (CodeGen dışı, elle eklendi; bkz. plan
/// "Admin Ayarlar" Faz). Logo/favicon URL'leri MediaController (/api/media) ile yüklenen
/// görsellerin yoludur, GA/meta alanları boşsa frontend statik varsayılanlara düşer.
/// </summary>
public sealed class SiteSettings : BaseEntity
{
    [MaxLength(500)]
    public string? LogoUrl { get; set; }

    [MaxLength(500)]
    public string? FaviconUrl { get; set; }

    [MaxLength(50)]
    public string? GaMeasurementId { get; set; }

    [MaxLength(200)]
    public string? DefaultMetaTitle { get; set; }

    [MaxLength(500)]
    public string? DefaultMetaDescription { get; set; }
}
