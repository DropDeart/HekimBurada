using BaseForge.Core.CQRS;
using BaseForge.Core.Interfaces;
using Marketplace.Entities;

namespace Marketplace.Features.Orders;

/// <summary>Kimliğe göre tek bir Order getirir — CodeGen dışı, elle eklendi. Yalnızca yetki kontrolü
/// (çağıran alıcı/satıcı mı) için OrdersController içeriden çağırır, kendi başına bir uç değil.</summary>
public sealed class GetOrderByIdQuery : IQuery<OrderDto?>
{
    public Guid Id { get; set; }
}

internal sealed class GetOrderByIdHandler : IQueryHandler<GetOrderByIdQuery, OrderDto?>
{
    private readonly IRepository<Order> _repository;

    public GetOrderByIdHandler(IRepository<Order> repository) => _repository = repository;

    public async Task<OrderDto?> Handle(GetOrderByIdQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken);
        return entity is null ? null : OrderDto.From(entity);
    }
}

/// <summary>Bir alıcının kendi siparişlerini (aldığı) sayfalı listeler — CodeGen dışı, elle eklendi.
/// BuyerId controller'da çağıranın kendi kimliğiyle ezilir (client-supplied değerine güvenilmiyor).
/// Satıcı tarafı (verdiği siparişler) için bkz. ListOrdersForSellerQuery.</summary>
public sealed class ListOrderQuery : PagedRequest, IQuery<PagedResult<OrderDto>>
{
    public Guid BuyerId { get; set; }

    /// <summary>Verilirse yalnızca bu ilana ait sipariş döner — bkz. ListOrdersForSellerQuery.ListingId
    /// ile aynı desen (tek bir ilanın siparişi için 200 kayıt çekip client'ta filtrelemeyi önler).</summary>
    public Guid? ListingId { get; set; }
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
            query =>
            {
                // "(request.ListingId == null || x.ListingId == request.ListingId)" yerine koşullu
                // Where zinciri — OR-null kalıbı Postgres'in index seek yapmasını zorlaştırabiliyor
                // (bkz. /simplify incelemesi).
                var filtered = query.Where(x => x.BuyerId == request.BuyerId);
                if (request.ListingId is { } listingId)
                {
                    filtered = filtered.Where(x => x.ListingId == listingId);
                }

                return filtered;
            },
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

/// <summary>
/// Bir satıcının, kendi ilanlarına gelen siparişlerini sayfalı listeler — CodeGen dışı, elle eklendi.
/// Önceki kararın aksine (bkz. ListOrderQuery doc yorumu — "satıcı tarafı görünümü yok") artık kasıtlı
/// olarak var: satıcı/admin, özellikle "bagis" ödeme yönteminde yüklenen dekontu görmeden siparişi
/// onaylayamıyordu (bkz. proje kararı). SellerId controller'da çağıranın kendi kimliğiyle ezilir.
/// </summary>
public sealed class ListOrdersForSellerQuery : PagedRequest, IQuery<PagedResult<OrderDto>>
{
    public Guid SellerId { get; set; }

    /// <summary>Verilirse yalnızca bu ilana ait siparişler döner.</summary>
    public Guid? ListingId { get; set; }

    /// <summary>Verilirse yalnızca bu alıcının siparişi döner — ilanlar/[id] sayfasında satıcının,
    /// kabul ettiği tek bir teklifin siparişini görmesi için (bkz. ListOrderQuery.ListingId ile aynı
    /// desen — 200 kayıt çekip client'ta buyerId'ye göre filtrelemeyi önler).</summary>
    public Guid? BuyerId { get; set; }
}

internal sealed class ListOrdersForSellerHandler : IQueryHandler<ListOrdersForSellerQuery, PagedResult<OrderDto>>
{
    private readonly IRepository<Order> _repository;

    public ListOrdersForSellerHandler(IRepository<Order> repository) => _repository = repository;

    public async Task<PagedResult<OrderDto>> Handle(ListOrdersForSellerQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var (items, totalCount) = await _repository.ListPagedAsync(
            request.Skip,
            request.PageSize,
            request.SortBy,
            query =>
            {
                var filtered = query.Where(x => x.SellerId == request.SellerId);
                if (request.ListingId is { } listingId)
                {
                    filtered = filtered.Where(x => x.ListingId == listingId);
                }

                if (request.BuyerId is { } buyerId)
                {
                    filtered = filtered.Where(x => x.BuyerId == buyerId);
                }

                return filtered;
            },
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
