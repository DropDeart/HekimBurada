using System.ComponentModel.DataAnnotations;
using BaseForge.Core.CQRS;
using BaseForge.Core.Exceptions;
using BaseForge.Core.Interfaces;
using Marketplace.Entities;

namespace Marketplace.Features.Offers;

/// <summary>Yeni bir Offer oluşturur; üretilen kimliği döndürür.</summary>
public sealed class CreateOfferCommand : ICommand<Guid>
{
    /// <summary>Amount.</summary>
    public decimal Amount { get; set; }
    /// <summary>Status.</summary>
    [MaxLength(20)]
    public string Status { get; set; } = "pending";
    /// <summary>ListingId.</summary>
    public Guid ListingId { get; set; }
    /// <summary>BuyerId.</summary>
    public Guid BuyerId { get; set; }
}

internal sealed class CreateOfferHandler : ICommandHandler<CreateOfferCommand, Guid>
{
    private readonly IRepository<Offer> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public CreateOfferHandler(IRepository<Offer> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Guid> Handle(CreateOfferCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = new Offer
        {
            Amount = request.Amount,
            Status = request.Status,
            ListingId = request.ListingId,
            BuyerId = request.BuyerId,
        };
        await _repository.AddAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return entity.Id;
    }
}

/// <summary>Var olan bir Offer kaydını günceller.</summary>
public sealed class UpdateOfferCommand : ICommand
{
    /// <summary>Güncellenecek kaydın kimliği.</summary>
    public Guid Id { get; set; }
    /// <summary>Amount.</summary>
    public decimal Amount { get; set; }
    /// <summary>Status.</summary>
    [MaxLength(20)]
    public string Status { get; set; } = "pending";
    /// <summary>ListingId.</summary>
    public Guid ListingId { get; set; }
    /// <summary>BuyerId.</summary>
    public Guid BuyerId { get; set; }
}

internal sealed class UpdateOfferHandler : ICommandHandler<UpdateOfferCommand>
{
    private readonly IRepository<Offer> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public UpdateOfferHandler(IRepository<Offer> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(UpdateOfferCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Offer", request.Id);
        entity.Amount = request.Amount;
        entity.Status = request.Status;
        entity.ListingId = request.ListingId;
        entity.BuyerId = request.BuyerId;
        await _repository.UpdateAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>Bir Offer kaydını siler (soft delete).</summary>
public sealed class DeleteOfferCommand : ICommand
{
    /// <summary>Silinecek kaydın kimliği.</summary>
    public Guid Id { get; set; }
}

internal sealed class DeleteOfferHandler : ICommandHandler<DeleteOfferCommand>
{
    private readonly IRepository<Offer> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public DeleteOfferHandler(IRepository<Offer> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(DeleteOfferCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Offer", request.Id);
        await _repository.DeleteAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
