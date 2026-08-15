using Marketplace.Entities;

namespace Marketplace.Features.Categorys;

/// <summary>Category veri transfer nesnesi.</summary>
public sealed class CategoryDto
{
    /// <summary>Kayıt kimliği.</summary>
    public Guid Id { get; set; }
    /// <summary>Name.</summary>
    public string Name { get; set; } = string.Empty;
    /// <summary>ParentId.</summary>
    public Guid? ParentId { get; set; }
    /// <summary>ListingKind — "product" | "big_ticket" | "job".</summary>
    public string ListingKind { get; set; } = "product";

    /// <summary>Bir Category entity'sinden DTO üretir.</summary>
    public static CategoryDto From(Category entity)
    {
        ArgumentNullException.ThrowIfNull(entity);
        return new CategoryDto
        {
            Id = entity.Id,
            Name = entity.Name,
            ParentId = entity.ParentId,
            ListingKind = entity.ListingKind,
        };
    }
}
