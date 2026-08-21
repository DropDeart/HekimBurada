using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using BaseForge.Core.Entities;

namespace Community.Entities;

/// <summary>Like entity'si (BaseForge.CodeGen tarafından üretildi).</summary>
public sealed class Like : BaseEntity
{
    /// <summary>TopicId — bir konu beğenisiyse dolu, yorum beğenisiyse null. CodeGen dışı: nullable'a
    /// çevrildi (bkz. CommentId doc yorumu — tam biri set edilmeli).</summary>
    public Guid? TopicId { get; set; }
    /// <summary>CommentId — bir yorum/yanıt beğenisiyse dolu, konu beğenisiyse null. TopicId/CommentId'den
    /// tam biri set edilmeli (handler'da doğrulanır). Nav property yok, düz skaler kolon. CodeGen dışı,
    /// elle eklendi.</summary>
    public Guid? CommentId { get; set; }
    /// <summary>AuthorId.</summary>
    public Guid AuthorId { get; set; }
    /// <summary>Topic (servis içi ilişki).</summary>
    public Topic? Topic { get; set; }
}
