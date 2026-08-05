using Marketplace.Entities;

namespace Marketplace.Features.Requests;

/// <summary>Request veri transfer nesnesi.</summary>
public sealed class RequestDto
{
    /// <summary>Kayıt kimliği.</summary>
    public Guid Id { get; set; }
    /// <summary>Title.</summary>
    public string Title { get; set; } = string.Empty;
    /// <summary>Description.</summary>
    public string Description { get; set; } = string.Empty;
    /// <summary>BudgetMax.</summary>
    public decimal? BudgetMax { get; set; }
    /// <summary>Status.</summary>
    public string Status { get; set; } = "open";
    /// <summary>CategoryId.</summary>
    public Guid CategoryId { get; set; }
    /// <summary>RequesterId.</summary>
    public Guid RequesterId { get; set; }

    /// <summary>Bir Request entity'sinden DTO üretir.</summary>
    public static RequestDto From(Request entity)
    {
        ArgumentNullException.ThrowIfNull(entity);
        return new RequestDto
        {
            Id = entity.Id,
            Title = entity.Title,
            Description = entity.Description,
            BudgetMax = entity.BudgetMax,
            Status = entity.Status,
            CategoryId = entity.CategoryId,
            RequesterId = entity.RequesterId,
        };
    }
}
