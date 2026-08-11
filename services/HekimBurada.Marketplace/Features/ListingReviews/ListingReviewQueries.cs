using BaseForge.Core.CQRS;
using BaseForge.Core.Interfaces;
using Marketplace.Entities;

namespace Marketplace.Features.ListingReviews;

/// <summary>Bir ilanın yorumlarını sayfalı listeler — CodeGen dışı, elle eklendi.</summary>
public sealed class ListListingReviewQuery : PagedRequest, IQuery<PagedResult<ListingReviewDto>>
{
    public Guid? ListingId { get; set; }
}

internal sealed class ListListingReviewHandler : IQueryHandler<ListListingReviewQuery, PagedResult<ListingReviewDto>>
{
    private readonly IRepository<ListingReview> _repository;

    public ListListingReviewHandler(IRepository<ListingReview> repository) => _repository = repository;

    public async Task<PagedResult<ListingReviewDto>> Handle(ListListingReviewQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var (items, totalCount) = await _repository.ListPagedAsync(
            request.Skip,
            request.PageSize,
            request.SortBy,
            query => request.ListingId.HasValue ? query.Where(x => x.ListingId == request.ListingId.Value) : query,
            cancellationToken);

        return new PagedResult<ListingReviewDto>
        {
            Items = items.Select(ListingReviewDto.From).ToList(),
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize,
        };
    }
}
