using System.ComponentModel.DataAnnotations;
using BaseForge.Core.CQRS;
using BaseForge.Core.Exceptions;
using BaseForge.Core.Interfaces;
using Community.Entities;

namespace Community.Features.CommunityCategorys;

/// <summary>Yeni bir CommunityCategory oluşturur; üretilen kimliği döndürür.</summary>
public sealed class CreateCommunityCategoryCommand : ICommand<Guid>
{
    /// <summary>Name.</summary>
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
}

internal sealed class CreateCommunityCategoryHandler : ICommandHandler<CreateCommunityCategoryCommand, Guid>
{
    private readonly IRepository<CommunityCategory> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public CreateCommunityCategoryHandler(IRepository<CommunityCategory> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Guid> Handle(CreateCommunityCategoryCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = new CommunityCategory
        {
            Name = request.Name,
        };
        await _repository.AddAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return entity.Id;
    }
}

/// <summary>Var olan bir CommunityCategory kaydını günceller.</summary>
public sealed class UpdateCommunityCategoryCommand : ICommand
{
    /// <summary>Güncellenecek kaydın kimliği.</summary>
    public Guid Id { get; set; }
    /// <summary>Name.</summary>
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
}

internal sealed class UpdateCommunityCategoryHandler : ICommandHandler<UpdateCommunityCategoryCommand>
{
    private readonly IRepository<CommunityCategory> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public UpdateCommunityCategoryHandler(IRepository<CommunityCategory> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(UpdateCommunityCategoryCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("CommunityCategory", request.Id);
        entity.Name = request.Name;
        await _repository.UpdateAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>Bir CommunityCategory kaydını siler (soft delete).</summary>
public sealed class DeleteCommunityCategoryCommand : ICommand
{
    /// <summary>Silinecek kaydın kimliği.</summary>
    public Guid Id { get; set; }
}

internal sealed class DeleteCommunityCategoryHandler : ICommandHandler<DeleteCommunityCategoryCommand>
{
    private readonly IRepository<CommunityCategory> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public DeleteCommunityCategoryHandler(IRepository<CommunityCategory> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(DeleteCommunityCategoryCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("CommunityCategory", request.Id);
        await _repository.DeleteAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
