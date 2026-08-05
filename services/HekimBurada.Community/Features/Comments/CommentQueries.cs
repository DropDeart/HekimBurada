using BaseForge.Core.CQRS;
using BaseForge.Core.Interfaces;
using Community.Entities;
using Microsoft.EntityFrameworkCore;

namespace Community.Features.Comments;

/// <summary>Kimliğe göre tek bir Comment getirir.</summary>
public sealed class GetCommentByIdQuery : IQuery<CommentDto?>
{
    /// <summary>Aranan kaydın kimliği.</summary>
    public Guid Id { get; set; }
}

internal sealed class GetCommentByIdHandler : IQueryHandler<GetCommentByIdQuery, CommentDto?>
{
    private readonly IRepository<Comment> _repository;

    public GetCommentByIdHandler(IRepository<Comment> repository) => _repository = repository;

    public async Task<CommentDto?> Handle(GetCommentByIdQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken);
        return entity is null ? null : CommentDto.From(entity);
    }
}

/// <summary>Comment kayıtlarını sayfalı, sıralı ve aranabilir biçimde listeler.</summary>
public sealed class ListCommentQuery : PagedRequest, IQuery<PagedResult<CommentDto>>;

internal sealed class ListCommentHandler : IQueryHandler<ListCommentQuery, PagedResult<CommentDto>>
{
    private readonly IRepository<Comment> _repository;

    public ListCommentHandler(IRepository<Comment> repository) => _repository = repository;

    public async Task<PagedResult<CommentDto>> Handle(ListCommentQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var (items, totalCount) = await _repository.ListPagedAsync(
            request.Skip,
            request.PageSize,
            request.SortBy,
            query => string.IsNullOrWhiteSpace(request.Search) ? query : query.Where(x => EF.Functions.ILike(x.Body, $"%{request.Search}%")),
            cancellationToken);

        return new PagedResult<CommentDto>
        {
            Items = items.Select(CommentDto.From).ToList(),
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize,
        };
    }
}
