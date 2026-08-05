using Marketplace.Entities;

namespace Marketplace.Features.Listings;

/// <summary>Listing veri transfer nesnesi.</summary>
public sealed class ListingDto
{
    /// <summary>Kayıt kimliği.</summary>
    public Guid Id { get; set; }
    /// <summary>Title.</summary>
    public string Title { get; set; } = string.Empty;
    /// <summary>Description.</summary>
    public string Description { get; set; } = string.Empty;
    /// <summary>Condition.</summary>
    public string Condition { get; set; } = string.Empty;
    /// <summary>Price.</summary>
    public decimal? Price { get; set; }
    /// <summary>OriginalPrice.</summary>
    public decimal? OriginalPrice { get; set; }
    /// <summary>PaymentMethod.</summary>
    public string PaymentMethod { get; set; } = string.Empty;
    /// <summary>ReferansUrl.</summary>
    public string? ReferansUrl { get; set; }
    /// <summary>City.</summary>
    public string City { get; set; } = string.Empty;
    /// <summary>Images.</summary>
    public string Images { get; set; } = string.Empty;
    /// <summary>Status.</summary>
    public string Status { get; set; } = "draft";
    /// <summary>DurationDays.</summary>
    public int DurationDays { get; set; }
    /// <summary>PublishedAt.</summary>
    public DateTimeOffset? PublishedAt { get; set; }
    /// <summary>ExpiresAt.</summary>
    public DateTimeOffset? ExpiresAt { get; set; }
    /// <summary>RenewCount.</summary>
    public int RenewCount { get; set; } = 0;
    /// <summary>IsFeatured.</summary>
    public bool IsFeatured { get; set; } = false;
    /// <summary>ViewCount.</summary>
    public int ViewCount { get; set; } = 0;
    /// <summary>CategoryId.</summary>
    public Guid CategoryId { get; set; }
    /// <summary>SellerId.</summary>
    public Guid SellerId { get; set; }

    /// <summary>Bir Listing entity'sinden DTO üretir.</summary>
    public static ListingDto From(Listing entity)
    {
        ArgumentNullException.ThrowIfNull(entity);
        return new ListingDto
        {
            Id = entity.Id,
            Title = entity.Title,
            Description = entity.Description,
            Condition = entity.Condition,
            Price = entity.Price,
            OriginalPrice = entity.OriginalPrice,
            PaymentMethod = entity.PaymentMethod,
            ReferansUrl = entity.ReferansUrl,
            City = entity.City,
            Images = entity.Images,
            Status = entity.Status,
            DurationDays = entity.DurationDays,
            PublishedAt = entity.PublishedAt,
            ExpiresAt = entity.ExpiresAt,
            RenewCount = entity.RenewCount,
            IsFeatured = entity.IsFeatured,
            ViewCount = entity.ViewCount,
            CategoryId = entity.CategoryId,
            SellerId = entity.SellerId,
        };
    }
}
