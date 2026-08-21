using Community.Entities;

namespace Community.Features.Likes;

/// <summary>Like veri transfer nesnesi.</summary>
public sealed class LikeDto
{
    /// <summary>Kayıt kimliği.</summary>
    public Guid Id { get; set; }
    /// <summary>TopicId — konu beğenisiyse dolu.</summary>
    public Guid? TopicId { get; set; }
    /// <summary>CommentId — yorum/yanıt beğenisiyse dolu. CodeGen dışı, elle eklendi.</summary>
    public Guid? CommentId { get; set; }
    /// <summary>AuthorId.</summary>
    public Guid AuthorId { get; set; }

    /// <summary>Bir Like entity'sinden DTO üretir.</summary>
    public static LikeDto From(Like entity)
    {
        ArgumentNullException.ThrowIfNull(entity);
        return new LikeDto
        {
            Id = entity.Id,
            TopicId = entity.TopicId,
            CommentId = entity.CommentId,
            AuthorId = entity.AuthorId,
        };
    }
}
