using BaseForge.Core.CQRS;
using BaseForge.Core.Interfaces;
using Community.Entities;

namespace Community.Features.Memberships;

/// <summary>Kimliğe göre tek bir Membership getirir.</summary>
public sealed class GetMembershipByIdQuery : IQuery<MembershipDto?>
{
    /// <summary>Aranan kaydın kimliği.</summary>
    public Guid Id { get; set; }
}

internal sealed class GetMembershipByIdHandler : IQueryHandler<GetMembershipByIdQuery, MembershipDto?>
{
    private readonly IRepository<Membership> _repository;

    public GetMembershipByIdHandler(IRepository<Membership> repository) => _repository = repository;

    public async Task<MembershipDto?> Handle(GetMembershipByIdQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken);
        return entity is null ? null : MembershipDto.From(entity);
    }
}

/// <summary>Membership kayıtlarını sayfalı, sıralı biçimde listeler.</summary>
public sealed class ListMembershipQuery : PagedRequest, IQuery<PagedResult<MembershipDto>>;

internal sealed class ListMembershipHandler : IQueryHandler<ListMembershipQuery, PagedResult<MembershipDto>>
{
    private readonly IRepository<Membership> _repository;

    public ListMembershipHandler(IRepository<Membership> repository) => _repository = repository;

    public async Task<PagedResult<MembershipDto>> Handle(ListMembershipQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var (items, totalCount) = await _repository.ListPagedAsync(
            request.Skip,
            request.PageSize,
            request.SortBy,
            null,
            cancellationToken);

        return new PagedResult<MembershipDto>
        {
            Items = items.Select(MembershipDto.From).ToList(),
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize,
        };
    }
}
