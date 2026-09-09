using BaseForge.Core.CQRS;
using BaseForge.Core.Interfaces;
using Marketplace.Entities;

namespace Marketplace.Features.RequestOffers;

/// <summary>Bir RequestOffer'ın geçmişini eskiden yeniye listeler — CodeGen dışı, elle eklendi.</summary>
public sealed class ListRequestOfferRevisionsQuery : IQuery<List<RequestOfferRevisionDto>>
{
    public Guid RequestOfferId { get; set; }
}

internal sealed class ListRequestOfferRevisionsHandler : IQueryHandler<ListRequestOfferRevisionsQuery, List<RequestOfferRevisionDto>>
{
    private readonly IRepository<RequestOfferRevision> _repository;

    public ListRequestOfferRevisionsHandler(IRepository<RequestOfferRevision> repository) => _repository = repository;

    public async Task<List<RequestOfferRevisionDto>> Handle(ListRequestOfferRevisionsQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var (items, _) = await _repository.ListPagedAsync(
            0,
            200,
            null,
            query => query.Where(x => x.RequestOfferId == request.RequestOfferId),
            cancellationToken);

        return items.OrderBy(x => x.CreatedAt).Select(RequestOfferRevisionDto.From).ToList();
    }
}
