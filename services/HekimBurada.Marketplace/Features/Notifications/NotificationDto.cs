using Marketplace.Entities;

namespace Marketplace.Features.Notifications;

/// <summary>Notification veri transfer nesnesi — CodeGen dışı, elle eklendi.</summary>
public sealed class NotificationDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string LinkPath { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public static NotificationDto From(Notification entity)
    {
        ArgumentNullException.ThrowIfNull(entity);
        return new NotificationDto
        {
            Id = entity.Id,
            Title = entity.Title,
            Body = entity.Body,
            LinkPath = entity.LinkPath,
            IsRead = entity.IsRead,
            CreatedAt = entity.CreatedAt,
        };
    }
}
