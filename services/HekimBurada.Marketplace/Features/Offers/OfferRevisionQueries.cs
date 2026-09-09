using BaseForge.Core.CQRS;
using BaseForge.Core.Interfaces;
using Marketplace.Entities;

namespace Marketplace.Features.Offers;

/// <summary>Bir Offer'ın geçmişini (ilk teklif, revizyon, kabul/red) eskiden yeniye listeler —
/// CodeGen dışı, elle eklendi.</summary>
public sealed class ListOfferRevisionsQuery : IQuery<List<OfferRevisionDto>>
{
    public Guid OfferId { get; set; }
}

internal sealed class ListOfferRevisionsHandler : IQueryHandler<ListOfferRevisionsQuery, List<OfferRevisionDto>>
{
    private readonly IRepository<OfferRevision> _repository;

    public ListOfferRevisionsHandler(IRepository<OfferRevision> repository) => _repository = repository;

    public async Task<List<OfferRevisionDto>> Handle(ListOfferRevisionsQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var (items, _) = await _repository.ListPagedAsync(
            0,
            200,
            null,
            query => query.Where(x => x.OfferId == request.OfferId),
            cancellationToken);

        return items.OrderBy(x => x.CreatedAt).Select(OfferRevisionDto.From).ToList();
    }
}
