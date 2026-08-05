using BaseForge.Core.Messaging;
using Community.Data;
using Community.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Community.Integration;

/// <summary>
/// <c>identity/DoctorProfileUpdated</c> olayının bu serviste tüketilen gölge şekli. BaseForge.CodeGen
/// bunu "minimal" (yalnızca Id) üretti çünkü Identity'nin bir spec.yaml'ı yok (kardeş-spec keşfi
/// çalışmıyor) — alanlar (UserId/Specialty/VerificationStatus) Identity'nin
/// DoctorVerificationController.PublishDoctorProfileUpdatedAsync'iyle BİREBİR eşleşecek şekilde
/// elle genişletildi (bkz. plan Faz B-2). Şekil uyuşmazsa mesaj deserialize edilemez, sessizce
/// '{queue}.dead'e düşer.
/// </summary>
public sealed class DoctorProfileUpdatedEvent : IIntegrationEvent
{
    /// <inheritdoc />
    public Guid EventId { get; init; } = Guid.NewGuid();

    /// <inheritdoc />
    public DateTimeOffset OccurredAt { get; init; } = DateTimeOffset.UtcNow;

    /// <inheritdoc />
    public string EventType => "identity/DoctorProfileUpdated";

    /// <summary>DoctorProfile kaydının olay payload'ı.</summary>
    public required DoctorProfileUpdatedEventData Data { get; init; }
}

/// <summary>DoctorProfileUpdated olayının taşıdığı alanlar.</summary>
public sealed class DoctorProfileUpdatedEventData
{
    public Guid UserId { get; set; }

    public string Specialty { get; set; } = string.Empty;

    public string VerificationStatus { get; set; } = string.Empty;
}

/// <summary>
/// Bir doktor onaylandığında (<c>VerificationStatus == "approved"</c>), uzmanlık alanına karşılık gelen
/// <see cref="CommunityCategory"/>'yi bulur/oluşturur ve kullanıcıyı otomatik olarak o branşa üye yapar
/// (idempotent — aynı üyelik ikinci kez eklenmez, örn. at-least-once teslimde tekrar tetiklenirse).
/// </summary>
internal sealed class SyncMembershipOnDoctorProfileUpdated : INotificationHandler<DoctorProfileUpdatedEvent>
{
    private readonly CommunityDbContext _db;

    public SyncMembershipOnDoctorProfileUpdated(CommunityDbContext db)
    {
        _db = db;
    }

    public async Task Handle(DoctorProfileUpdatedEvent notification, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(notification);

        if (!string.Equals(notification.Data.VerificationStatus, "approved", StringComparison.OrdinalIgnoreCase)
            || string.IsNullOrWhiteSpace(notification.Data.Specialty))
        {
            return;
        }

        var userId = notification.Data.UserId;
        var specialty = notification.Data.Specialty.Trim();

        var category = await _db.CommunityCategories.FirstOrDefaultAsync(c => c.Name == specialty, cancellationToken);
        if (category is null)
        {
            category = new CommunityCategory { Name = specialty };
            _db.CommunityCategories.Add(category);
            await _db.SaveChangesAsync(cancellationToken);
        }

        var alreadyMember = await _db.Memberships
            .AnyAsync(m => m.UserId == userId && m.CategoryId == category.Id, cancellationToken);
        if (alreadyMember)
        {
            return;
        }

        _db.Memberships.Add(new Membership
        {
            UserId = userId,
            CategoryId = category.Id,
            AutoJoined = true,
        });
        await _db.SaveChangesAsync(cancellationToken);
    }
}
