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
    /// <summary>Topic (servis içi ilişki).</summary>
    public Topic? Topic { get; set; }
}
