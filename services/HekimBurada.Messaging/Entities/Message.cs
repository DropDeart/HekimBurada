using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using BaseForge.Core.Entities;

namespace Messaging.Entities;

/// <summary>Message entity'si (BaseForge.CodeGen tarafından üretildi).</summary>
public sealed class Message : BaseEntity
{
    /// <summary>Body.</summary>
    [MaxLength(2000)]
    public string Body { get; set; } = string.Empty;
    /// <summary>OfferId.</summary>
    public Guid OfferId { get; set; }
    /// <summary>SenderId.</summary>
    public Guid SenderId { get; set; }
    /// <summary>Karşı taraf (SenderId dışındaki katılımcı) bu mesajı ne zaman okudu — null ise henüz
    /// okunmadı. Tek bir alanla yetiniyoruz çünkü her Offer sohbeti tam olarak 2 kişiliktir, "karşı
    /// taraf" SenderId'nin tersi olarak zaten bellidir. CodeGen dışı, elle eklendi.</summary>
    public DateTimeOffset? ReadAt { get; set; }
}
