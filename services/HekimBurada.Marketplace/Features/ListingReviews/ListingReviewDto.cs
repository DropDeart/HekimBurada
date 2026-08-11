using Marketplace.Entities;

namespace Marketplace.Features.ListingReviews;

/// <summary>ListingReview veri transfer nesnesi — CodeGen dışı, elle eklendi.</summary>
public sealed class ListingReviewDto
{
    public Guid Id { get; set; }
    public Guid ListingId { get; set; }
    public Guid AuthorId { get; set; }
    public int Rating { get; set; }
    public string Body { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }

    public static ListingReviewDto From(ListingReview entity)
    {
        ArgumentNullException.ThrowIfNull(entity);
        return new ListingReviewDto
        {
            Id = entity.Id,
            ListingId = entity.ListingId,
            AuthorId = entity.AuthorId,
            Rating = entity.Rating,
            Body = entity.Body,
            CreatedAt = entity.CreatedAt,
        };
    }
}
