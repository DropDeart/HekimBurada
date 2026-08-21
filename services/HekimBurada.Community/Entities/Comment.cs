using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using BaseForge.Core.Entities;

namespace Community.Entities;

/// <summary>Comment entity'si (BaseForge.CodeGen tarafından üretildi).</summary>
public sealed class Comment : BaseEntity
{
    /// <summary>Body.</summary>
    public string Body { get; set; } = string.Empty;
    /// <summary>TopicId.</summary>
    public Guid TopicId { get; set; }
    /// <summary>AuthorId.</summary>
    public Guid AuthorId { get; set; }
    /// <summary>Yanıtladığı yorum — null ise üst seviye yorum. Tek seviye iç içelik (yanıtın yanıtı da
    /// aynı üst yoruma bağlanır). Nav property yok, düz skaler kolon (repo'nun ID-only ref kalıbı) —
    /// self-referencing FK/cascade karmaşasından kaçınmak için. CodeGen dışı, elle eklendi.</summary>
    public Guid? ParentId { get; set; }
    /// <summary>Topic (servis içi ilişki).</summary>
    public Topic? Topic { get; set; }
}
