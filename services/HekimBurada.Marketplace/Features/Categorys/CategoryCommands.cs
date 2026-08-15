using System.ComponentModel.DataAnnotations;
using BaseForge.Core.CQRS;
using BaseForge.Core.Exceptions;
using BaseForge.Core.Interfaces;
using Marketplace.Entities;

namespace Marketplace.Features.Categorys;

/// <summary>Yeni bir Category oluşturur; üretilen kimliği döndürür.</summary>
public sealed class CreateCategoryCommand : ICommand<Guid>
{
    /// <summary>Name.</summary>
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    /// <summary>ParentId.</summary>
    public Guid? ParentId { get; set; }
    /// <summary>ListingKind — "product" | "big_ticket" | "job".</summary>
    [MaxLength(20)]
    public string ListingKind { get; set; } = "product";
}

internal sealed class CreateCategoryHandler : ICommandHandler<CreateCategoryCommand, Guid>
{
    private readonly IRepository<Category> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public CreateCategoryHandler(IRepository<Category> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Guid> Handle(CreateCategoryCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = new Category
        {
            Name = request.Name,
            ParentId = request.ParentId,
            ListingKind = request.ListingKind,
        };
        await _repository.AddAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return entity.Id;
    }
}

/// <summary>Var olan bir Category kaydını günceller.</summary>
public sealed class UpdateCategoryCommand : ICommand
{
    /// <summary>Güncellenecek kaydın kimliği.</summary>
    public Guid Id { get; set; }
    /// <summary>Name.</summary>
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    /// <summary>ParentId.</summary>
    public Guid? ParentId { get; set; }
    /// <summary>ListingKind — "product" | "big_ticket" | "job".</summary>
    [MaxLength(20)]
    public string ListingKind { get; set; } = "product";
}

internal sealed class UpdateCategoryHandler : ICommandHandler<UpdateCategoryCommand>
{
    private readonly IRepository<Category> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public UpdateCategoryHandler(IRepository<Category> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(UpdateCategoryCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Category", request.Id);
        entity.Name = request.Name;
        entity.ParentId = request.ParentId;
        entity.ListingKind = request.ListingKind;
        await _repository.UpdateAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>Bir Category kaydını siler (soft delete).</summary>
public sealed class DeleteCategoryCommand : ICommand
{
    /// <summary>Silinecek kaydın kimliği.</summary>
    public Guid Id { get; set; }
}

internal sealed class DeleteCategoryHandler : ICommandHandler<DeleteCategoryCommand>
{
    private readonly IRepository<Category> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public DeleteCategoryHandler(IRepository<Category> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(DeleteCategoryCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Category", request.Id);
        await _repository.DeleteAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
