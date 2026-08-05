using System.ComponentModel.DataAnnotations;
using BaseForge.Core.CQRS;
using BaseForge.Core.Exceptions;
using BaseForge.Core.Interfaces;
using Community.Entities;

namespace Community.Features.Memberships;

/// <summary>Yeni bir Membership oluşturur; üretilen kimliği döndürür.</summary>
public sealed class CreateMembershipCommand : ICommand<Guid>
{
    /// <summary>AutoJoined.</summary>
    public bool AutoJoined { get; set; } = true;
    /// <summary>CategoryId.</summary>
    public Guid CategoryId { get; set; }
    /// <summary>UserId.</summary>
    public Guid UserId { get; set; }
}

internal sealed class CreateMembershipHandler : ICommandHandler<CreateMembershipCommand, Guid>
{
    private readonly IRepository<Membership> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public CreateMembershipHandler(IRepository<Membership> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Guid> Handle(CreateMembershipCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = new Membership
        {
            AutoJoined = request.AutoJoined,
            CategoryId = request.CategoryId,
            UserId = request.UserId,
        };
        await _repository.AddAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return entity.Id;
    }
}

/// <summary>Var olan bir Membership kaydını günceller.</summary>
public sealed class UpdateMembershipCommand : ICommand
{
    /// <summary>Güncellenecek kaydın kimliği.</summary>
    public Guid Id { get; set; }
    /// <summary>AutoJoined.</summary>
    public bool AutoJoined { get; set; } = true;
    /// <summary>CategoryId.</summary>
    public Guid CategoryId { get; set; }
    /// <summary>UserId.</summary>
    public Guid UserId { get; set; }
}

internal sealed class UpdateMembershipHandler : ICommandHandler<UpdateMembershipCommand>
{
    private readonly IRepository<Membership> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public UpdateMembershipHandler(IRepository<Membership> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(UpdateMembershipCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Membership", request.Id);
        entity.AutoJoined = request.AutoJoined;
        entity.CategoryId = request.CategoryId;
        entity.UserId = request.UserId;
        await _repository.UpdateAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>Bir Membership kaydını siler (soft delete).</summary>
public sealed class DeleteMembershipCommand : ICommand
{
    /// <summary>Silinecek kaydın kimliği.</summary>
    public Guid Id { get; set; }
}

internal sealed class DeleteMembershipHandler : ICommandHandler<DeleteMembershipCommand>
{
    private readonly IRepository<Membership> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public DeleteMembershipHandler(IRepository<Membership> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(DeleteMembershipCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Membership", request.Id);
        await _repository.DeleteAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
