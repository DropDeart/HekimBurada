using Gateway.Entities;

namespace Gateway.Features.ContactMessages;

/// <summary>ContactMessage veri transfer nesnesi.</summary>
public sealed class ContactMessageDto
{
    /// <summary>Kayıt kimliği.</summary>
    public Guid Id { get; set; }
    /// <summary>Gönderenin adı.</summary>
    public string Name { get; set; } = string.Empty;
    /// <summary>Gönderenin e-postası.</summary>
    public string Email { get; set; } = string.Empty;
    /// <summary>Mesaj içeriği.</summary>
    public string Body { get; set; } = string.Empty;
    /// <summary>Durum: Yeni | İnceleniyor | Çözüldü.</summary>
    public string Status { get; set; } = string.Empty;
    /// <summary>Oluşturulma zamanı.</summary>
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>Bir ContactMessage entity'sinden DTO üretir.</summary>
    public static ContactMessageDto From(ContactMessage entity)
    {
        ArgumentNullException.ThrowIfNull(entity);
        return new ContactMessageDto
        {
            Id = entity.Id,
            Name = entity.Name,
            Email = entity.Email,
            Body = entity.Body,
            Status = entity.Status,
            CreatedAt = entity.CreatedAt,
        };
    }
}
