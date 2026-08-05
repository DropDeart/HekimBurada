using System.ComponentModel.DataAnnotations;
using BaseForge.Core.CQRS;
using BaseForge.Core.Exceptions;
using BaseForge.Core.Interfaces;
using Marketplace.Entities;

namespace Marketplace.Features.Favorites;

/// <summary>Yeni bir Favorite oluşturur; üretilen kimliği döndürür.</summary>
public sealed class CreateFavoriteCommand : ICommand<Guid>
{
    /// <summary>ListingId.</summary>
    public Guid ListingId { get; set; }
    /// <summary>UserId.</summary>
    public Guid UserId { get; set; }
}

internal sealed class CreateFavoriteHandler : ICommandHandler<CreateFavoriteCommand, Guid>
{
    private readonly IRepository<Favorite> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public CreateFavoriteHandler(IRepository<Favorite> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Guid> Handle(CreateFavoriteCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = new Favorite
        {
            ListingId = request.ListingId,
            UserId = request.UserId,
        };
        await _repository.AddAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return entity.Id;
    }
}

/// <summary>Var olan bir Favorite kaydını günceller.</summary>
public sealed class UpdateFavoriteCommand : ICommand
{
    /// <summary>Güncellenecek kaydın kimliği.</summary>
    public Guid Id { get; set; }
    /// <summary>ListingId.</summary>
    public Guid ListingId { get; set; }
    /// <summary>UserId.</summary>
    public Guid UserId { get; set; }
}

internal sealed class UpdateFavoriteHandler : ICommandHandler<UpdateFavoriteCommand>
{
    private readonly IRepository<Favorite> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public UpdateFavoriteHandler(IRepository<Favorite> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(UpdateFavoriteCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Favorite", request.Id);
        entity.ListingId = request.ListingId;
        entity.UserId = request.UserId;
        await _repository.UpdateAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>Bir Favorite kaydını siler (soft delete).</summary>
public sealed class DeleteFavoriteCommand : ICommand
{
    /// <summary>Silinecek kaydın kimliği.</summary>
    public Guid Id { get; set; }
}

internal sealed class DeleteFavoriteHandler : ICommandHandler<DeleteFavoriteCommand>
{
    private readonly IRepository<Favorite> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public DeleteFavoriteHandler(IRepository<Favorite> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(DeleteFavoriteCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Favorite", request.Id);
        await _repository.DeleteAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
