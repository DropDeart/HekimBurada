using Messaging.Entities;

namespace Messaging.Features.Messages;

/// <summary>Message veri transfer nesnesi.</summary>
public sealed class MessageDto
{
    /// <summary>Kayıt kimliği.</summary>
    public Guid Id { get; set; }
    /// <summary>Body.</summary>
    public string Body { get; set; } = string.Empty;
    /// <summary>OfferId.</summary>
    public Guid OfferId { get; set; }
    /// <summary>SenderId.</summary>
    public Guid SenderId { get; set; }

    /// <summary>Bir Message entity'sinden DTO üretir.</summary>
    public static MessageDto From(Message entity)
    {
        ArgumentNullException.ThrowIfNull(entity);
        return new MessageDto
        {
            Id = entity.Id,
            Body = entity.Body,
            OfferId = entity.OfferId,
            SenderId = entity.SenderId,
        };
    }
}
