using Community.Entities;

namespace Community.Features.Comments;

/// <summary>Comment veri transfer nesnesi.</summary>
public sealed class CommentDto
{
    /// <summary>Kayıt kimliği.</summary>
    public Guid Id { get; set; }
    /// <summary>Body.</summary>
    public string Body { get; set; } = string.Empty;
    /// <summary>TopicId.</summary>
    public Guid TopicId { get; set; }
    /// <summary>AuthorId.</summary>
    public Guid AuthorId { get; set; }
    /// <summary>Yanıtladığı yorum — null ise üst seviye yorum. CodeGen dışı, elle eklendi.</summary>
    public Guid? ParentId { get; set; }
    /// <summary>Oluşturulma zamanı — elle eklendi.</summary>
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>Bir Comment entity'sinden DTO üretir.</summary>
    public static CommentDto From(Comment entity)
    {
        ArgumentNullException.ThrowIfNull(entity);
        return new CommentDto
        {
            Id = entity.Id,
            Body = entity.Body,
            TopicId = entity.TopicId,
            AuthorId = entity.AuthorId,
            ParentId = entity.ParentId,
            CreatedAt = entity.CreatedAt,
        };
    }
}
