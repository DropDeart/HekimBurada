using BaseForge.Core.CQRS;
using BaseForge.Core.Interfaces;
using Community.Entities;
using Microsoft.EntityFrameworkCore;

namespace Community.Features.Topics;

/// <summary>Kimliğe göre tek bir Topic getirir.</summary>
public sealed class GetTopicByIdQuery : IQuery<TopicDto?>
{
    /// <summary>Aranan kaydın kimliği.</summary>
    public Guid Id { get; set; }
}

internal sealed class GetTopicByIdHandler : IQueryHandler<GetTopicByIdQuery, TopicDto?>
{
    private readonly IRepository<Topic> _repository;

    public GetTopicByIdHandler(IRepository<Topic> repository) => _repository = repository;

    public async Task<TopicDto?> Handle(GetTopicByIdQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken);
        return entity is null ? null : TopicDto.From(entity);
    }
}

/// <summary>Topic kayıtlarını sayfalı, sıralı ve aranabilir biçimde listeler.</summary>
public sealed class ListTopicQuery : PagedRequest, IQuery<PagedResult<TopicDto>>;

internal sealed class ListTopicHandler : IQueryHandler<ListTopicQuery, PagedResult<TopicDto>>
{
    private readonly IRepository<Topic> _repository;

    public ListTopicHandler(IRepository<Topic> repository) => _repository = repository;

    public async Task<PagedResult<TopicDto>> Handle(ListTopicQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var (items, totalCount) = await _repository.ListPagedAsync(
            request.Skip,
            request.PageSize,
            request.SortBy,
            query => string.IsNullOrWhiteSpace(request.Search) ? query : query.Where(x => EF.Functions.ILike(x.Title, $"%{request.Search}%") || EF.Functions.ILike(x.Body, $"%{request.Search}%")),
            cancellationToken);

        return new PagedResult<TopicDto>
        {
            Items = items.Select(TopicDto.From).ToList(),
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize,
        };
    }
}
