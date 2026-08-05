using BaseForge.Core.CQRS;
using BaseForge.Core.Interfaces;
using Marketplace.Entities;
using Microsoft.EntityFrameworkCore;

namespace Marketplace.Features.Listings;

/// <summary>Kimliğe göre tek bir Listing getirir.</summary>
public sealed class GetListingByIdQuery : IQuery<ListingDto?>
{
    /// <summary>Aranan kaydın kimliği.</summary>
    public Guid Id { get; set; }
}

internal sealed class GetListingByIdHandler : IQueryHandler<GetListingByIdQuery, ListingDto?>
{
    private readonly IRepository<Listing> _repository;

    public GetListingByIdHandler(IRepository<Listing> repository) => _repository = repository;

    public async Task<ListingDto?> Handle(GetListingByIdQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken);
        return entity is null ? null : ListingDto.From(entity);
    }
}

/// <summary>Listing kayıtlarını sayfalı, sıralı ve aranabilir biçimde listeler.</summary>
public sealed class ListListingQuery : PagedRequest, IQuery<PagedResult<ListingDto>>;

internal sealed class ListListingHandler : IQueryHandler<ListListingQuery, PagedResult<ListingDto>>
{
    private readonly IRepository<Listing> _repository;

    public ListListingHandler(IRepository<Listing> repository) => _repository = repository;

    public async Task<PagedResult<ListingDto>> Handle(ListListingQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var (items, totalCount) = await _repository.ListPagedAsync(
            request.Skip,
            request.PageSize,
            request.SortBy,
            query => string.IsNullOrWhiteSpace(request.Search) ? query : query.Where(x => EF.Functions.ILike(x.Title, $"%{request.Search}%") || EF.Functions.ILike(x.Description, $"%{request.Search}%") || EF.Functions.ILike(x.Condition, $"%{request.Search}%") || EF.Functions.ILike(x.PaymentMethod, $"%{request.Search}%") || EF.Functions.ILike((x.ReferansUrl ?? string.Empty), $"%{request.Search}%") || EF.Functions.ILike(x.City, $"%{request.Search}%") || EF.Functions.ILike(x.Images, $"%{request.Search}%") || EF.Functions.ILike(x.Status, $"%{request.Search}%")),
            cancellationToken);

        return new PagedResult<ListingDto>
        {
            Items = items.Select(ListingDto.From).ToList(),
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize,
        };
    }
}
