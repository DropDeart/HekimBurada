using BaseForge.Core.CQRS;
using BaseForge.Core.Interfaces;
using Marketplace.Entities;
using Microsoft.EntityFrameworkCore;

namespace Marketplace.Features.Requests;

/// <summary>Kimliğe göre tek bir Request getirir.</summary>
public sealed class GetRequestByIdQuery : IQuery<RequestDto?>
{
    /// <summary>Aranan kaydın kimliği.</summary>
    public Guid Id { get; set; }
}

internal sealed class GetRequestByIdHandler : IQueryHandler<GetRequestByIdQuery, RequestDto?>
{
    private readonly IRepository<Request> _repository;

    public GetRequestByIdHandler(IRepository<Request> repository) => _repository = repository;

    public async Task<RequestDto?> Handle(GetRequestByIdQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken);
        return entity is null ? null : RequestDto.From(entity);
    }
}

/// <summary>Request kayıtlarını sayfalı, sıralı ve aranabilir biçimde listeler.</summary>
public sealed class ListRequestQuery : PagedRequest, IQuery<PagedResult<RequestDto>>;

internal sealed class ListRequestHandler : IQueryHandler<ListRequestQuery, PagedResult<RequestDto>>
{
    private readonly IRepository<Request> _repository;

    public ListRequestHandler(IRepository<Request> repository) => _repository = repository;

    public async Task<PagedResult<RequestDto>> Handle(ListRequestQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var (items, totalCount) = await _repository.ListPagedAsync(
            request.Skip,
            request.PageSize,
            request.SortBy,
            query => string.IsNullOrWhiteSpace(request.Search) ? query : query.Where(x => EF.Functions.ILike(x.Title, $"%{request.Search}%") || EF.Functions.ILike(x.Description, $"%{request.Search}%") || EF.Functions.ILike(x.Status, $"%{request.Search}%")),
            cancellationToken);

        return new PagedResult<RequestDto>
        {
            Items = items.Select(RequestDto.From).ToList(),
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize,
        };
    }
}
