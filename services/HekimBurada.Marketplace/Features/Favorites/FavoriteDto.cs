using Marketplace.Entities;

namespace Marketplace.Features.Favorites;

/// <summary>Favorite veri transfer nesnesi.</summary>
public sealed class FavoriteDto
{
    /// <summary>Kayıt kimliği.</summary>
    public Guid Id { get; set; }
    /// <summary>ListingId.</summary>
    public Guid ListingId { get; set; }
    /// <summary>UserId.</summary>
    public Guid UserId { get; set; }

    /// <summary>Bir Favorite entity'sinden DTO üretir.</summary>
    public static FavoriteDto From(Favorite entity)
    {
        ArgumentNullException.ThrowIfNull(entity);
        return new FavoriteDto
        {
            Id = entity.Id,
            ListingId = entity.ListingId,
            UserId = entity.UserId,
        };
    }
}
