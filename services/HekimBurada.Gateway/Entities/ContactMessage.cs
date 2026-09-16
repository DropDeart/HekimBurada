using System.ComponentModel.DataAnnotations;
using BaseForge.Core.Entities;

namespace Gateway.Entities;

/// <summary>İletişim formundan gelen destek talebi — CodeGen dışı, elle eklendi.</summary>
public sealed class ContactMessage : BaseEntity
{
    /// <summary>Gönderenin adı.</summary>
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    /// <summary>Gönderenin e-postası — yanıt bu adrese gönderilir.</summary>
    [MaxLength(200)]
    public string Email { get; set; } = string.Empty;

    /// <summary>Mesaj içeriği.</summary>
    public string Body { get; set; } = string.Empty;

    /// <summary>Durum: Yeni | İnceleniyor | Çözüldü.</summary>
    [MaxLength(20)]
    public string Status { get; set; } = "Yeni";
}
