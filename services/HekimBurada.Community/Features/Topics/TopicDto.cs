using Community.Entities;

namespace Community.Features.Topics;

/// <summary>Topic veri transfer nesnesi.</summary>
public sealed class TopicDto
{
    /// <summary>Kayıt kimliği.</summary>
    public Guid Id { get; set; }
    /// <summary>Title.</summary>
    public string Title { get; set; } = string.Empty;
    /// <summary>Body.</summary>
    public string Body { get; set; } = string.Empty;
    /// <summary>ViewCount.</summary>
    public int ViewCount { get; set; } = 0;
    /// <summary>IsPinned.</summary>
    public bool IsPinned { get; set; } = false;
    /// <summary>IsLocked.</summary>
    public bool IsLocked { get; set; } = false;
    /// <summary>CategoryId.</summary>
    public Guid CategoryId { get; set; }
    /// <summary>AuthorId.</summary>
    public Guid AuthorId { get; set; }

    /// <summary>Bir Topic entity'sinden DTO üretir.</summary>
    public static TopicDto From(Topic entity)
    {
        ArgumentNullException.ThrowIfNull(entity);
        return new TopicDto
        {
            Id = entity.Id,
            Title = entity.Title,
            Body = entity.Body,
            ViewCount = entity.ViewCount,
            IsPinned = entity.IsPinned,
            IsLocked = entity.IsLocked,
            CategoryId = entity.CategoryId,
            AuthorId = entity.AuthorId,
        };
    }
}
