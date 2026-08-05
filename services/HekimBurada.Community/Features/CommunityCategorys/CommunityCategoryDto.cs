using Community.Entities;

namespace Community.Features.CommunityCategorys;

/// <summary>CommunityCategory veri transfer nesnesi.</summary>
public sealed class CommunityCategoryDto
{
    /// <summary>Kayıt kimliği.</summary>
    public Guid Id { get; set; }
    /// <summary>Name.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Bir CommunityCategory entity'sinden DTO üretir.</summary>
    public static CommunityCategoryDto From(CommunityCategory entity)
    {
        ArgumentNullException.ThrowIfNull(entity);
        return new CommunityCategoryDto
        {
            Id = entity.Id,
            Name = entity.Name,
        };
    }
}
