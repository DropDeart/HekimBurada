using BaseForge.Core.CQRS;
using BaseForge.Core.Interfaces;
using Marketplace.Entities;
using Microsoft.EntityFrameworkCore;

namespace Marketplace.Features.Offers;

/// <summary>Kimliğe göre tek bir Offer getirir.</summary>
public sealed class GetOfferByIdQuery : IQuery<OfferDto?>
{
    /// <summary>Aranan kaydın kimliği.</summary>
    public Guid Id { get; set; }
}

internal sealed class GetOfferByIdHandler : IQueryHandler<GetOfferByIdQuery, OfferDto?>
{
    private readonly IRepository<Offer> _repository;

    public GetOfferByIdHandler(IRepository<Offer> repository) => _repository = repository;

    public async Task<OfferDto?> Handle(GetOfferByIdQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken);
        return entity is null ? null : OfferDto.From(entity);
    }
}

/// <summary>Offer kayıtlarını sayfalı, sıralı ve aranabilir biçimde listeler.</summary>
public sealed class ListOfferQuery : PagedRequest, IQuery<PagedResult<OfferDto>>;

internal sealed class ListOfferHandler : IQueryHandler<ListOfferQuery, PagedResult<OfferDto>>
{
    private readonly IRepository<Offer> _repository;

    public ListOfferHandler(IRepository<Offer> repository) => _repository = repository;

    public async Task<PagedResult<OfferDto>> Handle(ListOfferQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var (items, totalCount) = await _repository.ListPagedAsync(
            request.Skip,
            request.PageSize,
            request.SortBy,
            query => string.IsNullOrWhiteSpace(request.Search) ? query : query.Where(x => EF.Functions.ILike(x.Status, $"%{request.Search}%")),
            cancellationToken);

        return new PagedResult<OfferDto>
        {
            Items = items.Select(OfferDto.From).ToList(),
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize,
        };
    }
}
