using BaseForge.Core.CQRS;
using BaseForge.Core.Interfaces;
using Community.Entities;
using Microsoft.EntityFrameworkCore;

namespace Community.Features.CommunityCategorys;

/// <summary>Kimliğe göre tek bir CommunityCategory getirir.</summary>
public sealed class GetCommunityCategoryByIdQuery : IQuery<CommunityCategoryDto?>
{
    /// <summary>Aranan kaydın kimliği.</summary>
    public Guid Id { get; set; }
}

internal sealed class GetCommunityCategoryByIdHandler : IQueryHandler<GetCommunityCategoryByIdQuery, CommunityCategoryDto?>
{
    private readonly IRepository<CommunityCategory> _repository;

    public GetCommunityCategoryByIdHandler(IRepository<CommunityCategory> repository) => _repository = repository;

    public async Task<CommunityCategoryDto?> Handle(GetCommunityCategoryByIdQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken);
        return entity is null ? null : CommunityCategoryDto.From(entity);
    }
}

/// <summary>CommunityCategory kayıtlarını sayfalı, sıralı ve aranabilir biçimde listeler.</summary>
public sealed class ListCommunityCategoryQuery : PagedRequest, IQuery<PagedResult<CommunityCategoryDto>>;

internal sealed class ListCommunityCategoryHandler : IQueryHandler<ListCommunityCategoryQuery, PagedResult<CommunityCategoryDto>>
{
    private readonly IRepository<CommunityCategory> _repository;

    public ListCommunityCategoryHandler(IRepository<CommunityCategory> repository) => _repository = repository;

    public async Task<PagedResult<CommunityCategoryDto>> Handle(ListCommunityCategoryQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var (items, totalCount) = await _repository.ListPagedAsync(
            request.Skip,
            request.PageSize,
            request.SortBy,
            query => string.IsNullOrWhiteSpace(request.Search) ? query : query.Where(x => EF.Functions.ILike(x.Name, $"%{request.Search}%")),
            cancellationToken);

        return new PagedResult<CommunityCategoryDto>
        {
            Items = items.Select(CommunityCategoryDto.From).ToList(),
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize,
        };
    }
}
