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
    /// <summary>Oluşturulma zamanı — elle eklendi.</summary>
    public DateTime CreatedAt { get; set; }

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
            CreatedAt = entity.CreatedAt,
        };
    }
}
