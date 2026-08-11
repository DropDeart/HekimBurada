using BaseForge.Core.CQRS;
using BaseForge.Core.Interfaces;
using Marketplace.Entities;
using Microsoft.EntityFrameworkCore;

namespace Marketplace.Features.RequestOffers;

/// <summary>Kimliğe göre tek bir RequestOffer getirir — CodeGen dışı, elle eklendi.</summary>
public sealed class GetRequestOfferByIdQuery : IQuery<RequestOfferDto?>
{
    public Guid Id { get; set; }
}

internal sealed class GetRequestOfferByIdHandler : IQueryHandler<GetRequestOfferByIdQuery, RequestOfferDto?>
{
    private readonly IRepository<RequestOffer> _repository;

    public GetRequestOfferByIdHandler(IRepository<RequestOffer> repository) => _repository = repository;

    public async Task<RequestOfferDto?> Handle(GetRequestOfferByIdQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken);
        return entity is null ? null : RequestOfferDto.From(entity);
    }
}

/// <summary>RequestOffer kayıtlarını sayfalı listeler, isteğe bağlı RequestId filtresiyle — CodeGen dışı, elle eklendi.</summary>
public sealed class ListRequestOfferQuery : PagedRequest, IQuery<PagedResult<RequestOfferDto>>
{
    public Guid? RequestId { get; set; }
}

internal sealed class ListRequestOfferHandler : IQueryHandler<ListRequestOfferQuery, PagedResult<RequestOfferDto>>
{
    private readonly IRepository<RequestOffer> _repository;

    public ListRequestOfferHandler(IRepository<RequestOffer> repository) => _repository = repository;

    public async Task<PagedResult<RequestOfferDto>> Handle(ListRequestOfferQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var (items, totalCount) = await _repository.ListPagedAsync(
            request.Skip,
            request.PageSize,
            request.SortBy,
            query => request.RequestId.HasValue ? query.Where(x => x.RequestId == request.RequestId.Value) : query,
            cancellationToken);

        return new PagedResult<RequestOfferDto>
        {
            Items = items.Select(RequestOfferDto.From).ToList(),
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize,
        };
    }
}
