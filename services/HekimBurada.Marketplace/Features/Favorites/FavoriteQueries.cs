using BaseForge.Core.CQRS;
using BaseForge.Core.Interfaces;
using Marketplace.Entities;

namespace Marketplace.Features.Favorites;

/// <summary>Kimliğe göre tek bir Favorite getirir.</summary>
public sealed class GetFavoriteByIdQuery : IQuery<FavoriteDto?>
{
    /// <summary>Aranan kaydın kimliği.</summary>
    public Guid Id { get; set; }
}

internal sealed class GetFavoriteByIdHandler : IQueryHandler<GetFavoriteByIdQuery, FavoriteDto?>
{
    private readonly IRepository<Favorite> _repository;

    public GetFavoriteByIdHandler(IRepository<Favorite> repository) => _repository = repository;

    public async Task<FavoriteDto?> Handle(GetFavoriteByIdQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken);
        return entity is null ? null : FavoriteDto.From(entity);
    }
}

/// <summary>Favorite kayıtlarını sayfalı, sıralı biçimde listeler.</summary>
public sealed class ListFavoriteQuery : PagedRequest, IQuery<PagedResult<FavoriteDto>>;

internal sealed class ListFavoriteHandler : IQueryHandler<ListFavoriteQuery, PagedResult<FavoriteDto>>
{
    private readonly IRepository<Favorite> _repository;

    public ListFavoriteHandler(IRepository<Favorite> repository) => _repository = repository;

    public async Task<PagedResult<FavoriteDto>> Handle(ListFavoriteQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var (items, totalCount) = await _repository.ListPagedAsync(
            request.Skip,
            request.PageSize,
            request.SortBy,
            null,
            cancellationToken);

        return new PagedResult<FavoriteDto>
        {
            Items = items.Select(FavoriteDto.From).ToList(),
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize,
        };
    }
}
