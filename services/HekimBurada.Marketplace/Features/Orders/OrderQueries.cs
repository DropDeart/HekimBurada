using BaseForge.Core.CQRS;
using BaseForge.Core.Interfaces;
using Marketplace.Entities;

namespace Marketplace.Features.Orders;

/// <summary>Bir alıcının kendi siparişlerini sayfalı listeler — CodeGen dışı, elle eklendi.
/// BuyerId controller'da çağıranın kendi kimliğiyle ezilir (client-supplied değerine güvenilmiyor).</summary>
public sealed class ListOrderQuery : PagedRequest, IQuery<PagedResult<OrderDto>>
{
    public Guid BuyerId { get; set; }
}

internal sealed class ListOrderHandler : IQueryHandler<ListOrderQuery, PagedResult<OrderDto>>
{
    private readonly IRepository<Order> _repository;

    public ListOrderHandler(IRepository<Order> repository) => _repository = repository;

    public async Task<PagedResult<OrderDto>> Handle(ListOrderQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var (items, totalCount) = await _repository.ListPagedAsync(
            request.Skip,
            request.PageSize,
            request.SortBy,
            query => query.Where(x => x.BuyerId == request.BuyerId),
            cancellationToken);

        return new PagedResult<OrderDto>
        {
            Items = items.Select(OrderDto.From).ToList(),
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize,
        };
    }
}
