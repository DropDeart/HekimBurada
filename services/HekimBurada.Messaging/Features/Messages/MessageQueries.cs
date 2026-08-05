using BaseForge.Core.CQRS;
using BaseForge.Core.Interfaces;
using Messaging.Entities;
using Microsoft.EntityFrameworkCore;

namespace Messaging.Features.Messages;

/// <summary>Kimliğe göre tek bir Message getirir.</summary>
public sealed class GetMessageByIdQuery : IQuery<MessageDto?>
{
    /// <summary>Aranan kaydın kimliği.</summary>
    public Guid Id { get; set; }
}

internal sealed class GetMessageByIdHandler : IQueryHandler<GetMessageByIdQuery, MessageDto?>
{
    private readonly IRepository<Message> _repository;

    public GetMessageByIdHandler(IRepository<Message> repository) => _repository = repository;

    public async Task<MessageDto?> Handle(GetMessageByIdQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken);
        return entity is null ? null : MessageDto.From(entity);
    }
}

/// <summary>Message kayıtlarını sayfalı, sıralı ve aranabilir biçimde listeler.</summary>
public sealed class ListMessageQuery : PagedRequest, IQuery<PagedResult<MessageDto>>;

internal sealed class ListMessageHandler : IQueryHandler<ListMessageQuery, PagedResult<MessageDto>>
{
    private readonly IRepository<Message> _repository;

    public ListMessageHandler(IRepository<Message> repository) => _repository = repository;

    public async Task<PagedResult<MessageDto>> Handle(ListMessageQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var (items, totalCount) = await _repository.ListPagedAsync(
            request.Skip,
            request.PageSize,
            request.SortBy,
            query => string.IsNullOrWhiteSpace(request.Search) ? query : query.Where(x => EF.Functions.ILike(x.Body, $"%{request.Search}%")),
            cancellationToken);

        return new PagedResult<MessageDto>
        {
            Items = items.Select(MessageDto.From).ToList(),
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize,
        };
    }
}
