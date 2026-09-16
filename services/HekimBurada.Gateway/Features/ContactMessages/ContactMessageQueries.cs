using BaseForge.Core.CQRS;
using BaseForge.Core.Interfaces;
using Gateway.Entities;
using Microsoft.EntityFrameworkCore;

namespace Gateway.Features.ContactMessages;

/// <summary>Kimliğe göre tek bir ContactMessage getirir.</summary>
public sealed class GetContactMessageByIdQuery : IQuery<ContactMessageDto?>
{
    /// <summary>Aranan kaydın kimliği.</summary>
    public Guid Id { get; set; }
}

internal sealed class GetContactMessageByIdHandler : IQueryHandler<GetContactMessageByIdQuery, ContactMessageDto?>
{
    private readonly IRepository<ContactMessage> _repository;

    public GetContactMessageByIdHandler(IRepository<ContactMessage> repository) => _repository = repository;

    public async Task<ContactMessageDto?> Handle(GetContactMessageByIdQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken);
        return entity is null ? null : ContactMessageDto.From(entity);
    }
}

/// <summary>ContactMessage kayıtlarını sayfalı, sıralı ve aranabilir biçimde listeler — CodeGen dışı:
/// status filtresi elle eklendi (admin panelinde "Yeni" öncelikli görünsün diye).</summary>
public sealed class ListContactMessageQuery : PagedRequest, IQuery<PagedResult<ContactMessageDto>>
{
    /// <summary>Verilirse yalnızca bu durumdaki kayıtlar döner.</summary>
    public string? Status { get; set; }
}

internal sealed class ListContactMessageHandler : IQueryHandler<ListContactMessageQuery, PagedResult<ContactMessageDto>>
{
    private readonly IRepository<ContactMessage> _repository;

    public ListContactMessageHandler(IRepository<ContactMessage> repository) => _repository = repository;

    public async Task<PagedResult<ContactMessageDto>> Handle(ListContactMessageQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var (items, totalCount) = await _repository.ListPagedAsync(
            request.Skip,
            request.PageSize,
            request.SortBy,
            query =>
            {
                if (!string.IsNullOrWhiteSpace(request.Status))
                {
                    query = query.Where(x => x.Status == request.Status);
                }

                return string.IsNullOrWhiteSpace(request.Search)
                    ? query
                    : query.Where(x =>
                        EF.Functions.ILike(x.Name, $"%{request.Search}%") ||
                        EF.Functions.ILike(x.Email, $"%{request.Search}%") ||
                        EF.Functions.ILike(x.Body, $"%{request.Search}%"));
            },
            cancellationToken);

        return new PagedResult<ContactMessageDto>
        {
            Items = items.Select(ContactMessageDto.From).ToList(),
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize,
        };
    }
}
