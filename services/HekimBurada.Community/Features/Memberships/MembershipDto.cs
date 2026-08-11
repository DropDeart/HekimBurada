using Community.Entities;

namespace Community.Features.Memberships;

/// <summary>Membership veri transfer nesnesi.</summary>
public sealed class MembershipDto
{
    /// <summary>Kayıt kimliği.</summary>
    public Guid Id { get; set; }
    /// <summary>AutoJoined.</summary>
    public bool AutoJoined { get; set; } = true;
    /// <summary>CategoryId.</summary>
    public Guid CategoryId { get; set; }
    /// <summary>UserId.</summary>
    public Guid UserId { get; set; }
    /// <summary>Topluluğun ilk üyesi mi (bkz. Membership.IsAdmin doc yorumu) — üye çıkarma yetkisi taşır.</summary>
    public bool IsAdmin { get; set; }

    /// <summary>Bir Membership entity'sinden DTO üretir.</summary>
    public static MembershipDto From(Membership entity)
    {
        ArgumentNullException.ThrowIfNull(entity);
        return new MembershipDto
        {
            Id = entity.Id,
            AutoJoined = entity.AutoJoined,
            CategoryId = entity.CategoryId,
            UserId = entity.UserId,
            IsAdmin = entity.IsAdmin,
        };
    }
}
