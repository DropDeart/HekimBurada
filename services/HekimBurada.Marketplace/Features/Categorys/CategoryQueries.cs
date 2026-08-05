using BaseForge.Core.CQRS;
using BaseForge.Core.Interfaces;
using Marketplace.Entities;
using Microsoft.EntityFrameworkCore;

namespace Marketplace.Features.Categorys;

/// <summary>Kimliğe göre tek bir Category getirir.</summary>
public sealed class GetCategoryByIdQuery : IQuery<CategoryDto?>
{
    /// <summary>Aranan kaydın kimliği.</summary>
    public Guid Id { get; set; }
}

internal sealed class GetCategoryByIdHandler : IQueryHandler<GetCategoryByIdQuery, CategoryDto?>
{
    private readonly IRepository<Category> _repository;

    public GetCategoryByIdHandler(IRepository<Category> repository) => _repository = repository;

    public async Task<CategoryDto?> Handle(GetCategoryByIdQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken);
        return entity is null ? null : CategoryDto.From(entity);
    }
}

/// <summary>Category kayıtlarını sayfalı, sıralı ve aranabilir biçimde listeler.</summary>
public sealed class ListCategoryQuery : PagedRequest, IQuery<PagedResult<CategoryDto>>;

internal sealed class ListCategoryHandler : IQueryHandler<ListCategoryQuery, PagedResult<CategoryDto>>
{
    private readonly IRepository<Category> _repository;

    public ListCategoryHandler(IRepository<Category> repository) => _repository = repository;

    public async Task<PagedResult<CategoryDto>> Handle(ListCategoryQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var (items, totalCount) = await _repository.ListPagedAsync(
            request.Skip,
            request.PageSize,
            request.SortBy,
            query => string.IsNullOrWhiteSpace(request.Search) ? query : query.Where(x => EF.Functions.ILike(x.Name, $"%{request.Search}%")),
            cancellationToken);

        return new PagedResult<CategoryDto>
        {
            Items = items.Select(CategoryDto.From).ToList(),
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize,
        };
    }
}
