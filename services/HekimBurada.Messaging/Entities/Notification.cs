using System.ComponentModel.DataAnnotations;
using BaseForge.Core.Entities;

namespace Messaging.Entities;

/// <summary>Kullanıcıya yönelik uygulama içi bildirim (örn. yeni mesaj geldi) — CodeGen dışı,
/// elle eklendi.</summary>
public sealed class Notification : BaseEntity
{
    /// <summary>Bildirimin sahibi.</summary>
    public Guid RecipientUserId { get; set; }
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    /// <summary>Tıklanınca gidilecek frontend yolu (örn. /ilanlar/{listingId}).</summary>
    [MaxLength(300)]
    public string LinkPath { get; set; } = string.Empty;
    public bool IsRead { get; set; } = false;
}
