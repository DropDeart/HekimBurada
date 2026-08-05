using BaseForge.Core.CQRS;
using BaseForge.Core.Interfaces;
using Gateway.Entities;
using Microsoft.EntityFrameworkCore;

namespace Gateway.Features.Announcements;

/// <summary>Kimliğe göre tek bir Announcement getirir.</summary>
public sealed class GetAnnouncementByIdQuery : IQuery<AnnouncementDto?>
{
    /// <summary>Aranan kaydın kimliği.</summary>
    public Guid Id { get; set; }
}

internal sealed class GetAnnouncementByIdHandler : IQueryHandler<GetAnnouncementByIdQuery, AnnouncementDto?>
{
    private readonly IRepository<Announcement> _repository;

    public GetAnnouncementByIdHandler(IRepository<Announcement> repository) => _repository = repository;

    public async Task<AnnouncementDto?> Handle(GetAnnouncementByIdQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken);
        return entity is null ? null : AnnouncementDto.From(entity);
    }
}

/// <summary>Announcement kayıtlarını sayfalı, sıralı ve aranabilir biçimde listeler.</summary>
public sealed class ListAnnouncementQuery : PagedRequest, IQuery<PagedResult<AnnouncementDto>>;

internal sealed class ListAnnouncementHandler : IQueryHandler<ListAnnouncementQuery, PagedResult<AnnouncementDto>>
{
    private readonly IRepository<Announcement> _repository;

    public ListAnnouncementHandler(IRepository<Announcement> repository) => _repository = repository;

    public async Task<PagedResult<AnnouncementDto>> Handle(ListAnnouncementQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var (items, totalCount) = await _repository.ListPagedAsync(
            request.Skip,
            request.PageSize,
            request.SortBy,
            query => string.IsNullOrWhiteSpace(request.Search) ? query : query.Where(x => EF.Functions.ILike(x.Title, $"%{request.Search}%") || EF.Functions.ILike(x.Body, $"%{request.Search}%")),
            cancellationToken);

        return new PagedResult<AnnouncementDto>
        {
            Items = items.Select(AnnouncementDto.From).ToList(),
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize,
        };
    }
}
