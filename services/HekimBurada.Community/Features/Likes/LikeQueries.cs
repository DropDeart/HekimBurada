using BaseForge.Core.CQRS;
using BaseForge.Core.Interfaces;
using Community.Entities;

namespace Community.Features.Likes;

/// <summary>Kimliğe göre tek bir Like getirir.</summary>
public sealed class GetLikeByIdQuery : IQuery<LikeDto?>
{
    /// <summary>Aranan kaydın kimliği.</summary>
    public Guid Id { get; set; }
}

internal sealed class GetLikeByIdHandler : IQueryHandler<GetLikeByIdQuery, LikeDto?>
{
    private readonly IRepository<Like> _repository;

    public GetLikeByIdHandler(IRepository<Like> repository) => _repository = repository;

    public async Task<LikeDto?> Handle(GetLikeByIdQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken);
        return entity is null ? null : LikeDto.From(entity);
    }
}

/// <summary>Like kayıtlarını sayfalı, sıralı biçimde listeler.</summary>
public sealed class ListLikeQuery : PagedRequest, IQuery<PagedResult<LikeDto>>;

internal sealed class ListLikeHandler : IQueryHandler<ListLikeQuery, PagedResult<LikeDto>>
{
    private readonly IRepository<Like> _repository;

    public ListLikeHandler(IRepository<Like> repository) => _repository = repository;

    public async Task<PagedResult<LikeDto>> Handle(ListLikeQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var (items, totalCount) = await _repository.ListPagedAsync(
            request.Skip,
            request.PageSize,
            request.SortBy,
            null,
            cancellationToken);

        return new PagedResult<LikeDto>
        {
            Items = items.Select(LikeDto.From).ToList(),
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize,
        };
    }
}
