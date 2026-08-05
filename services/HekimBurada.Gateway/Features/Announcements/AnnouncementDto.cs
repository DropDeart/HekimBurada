using Gateway.Entities;

namespace Gateway.Features.Announcements;

/// <summary>Announcement veri transfer nesnesi.</summary>
public sealed class AnnouncementDto
{
    /// <summary>Kayıt kimliği.</summary>
    public Guid Id { get; set; }
    /// <summary>Title.</summary>
    public string Title { get; set; } = string.Empty;
    /// <summary>Body.</summary>
    public string Body { get; set; } = string.Empty;
    /// <summary>PublishedAt.</summary>
    public DateTimeOffset PublishedAt { get; set; }
    /// <summary>AuthorId.</summary>
    public Guid AuthorId { get; set; }

    /// <summary>Bir Announcement entity'sinden DTO üretir.</summary>
    public static AnnouncementDto From(Announcement entity)
    {
        ArgumentNullException.ThrowIfNull(entity);
        return new AnnouncementDto
        {
            Id = entity.Id,
            Title = entity.Title,
            Body = entity.Body,
            PublishedAt = entity.PublishedAt,
            AuthorId = entity.AuthorId,
        };
    }
}
