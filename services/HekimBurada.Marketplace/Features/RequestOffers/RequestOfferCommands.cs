using System.ComponentModel.DataAnnotations;
using BaseForge.Core.CQRS;
using BaseForge.Core.Exceptions;
using BaseForge.Core.Interfaces;
using Marketplace.Entities;

namespace Marketplace.Features.RequestOffers;

/// <summary>Bir Talebe yeni bir karşılık teklifi oluşturur — CodeGen dışı, elle eklendi.</summary>
public sealed class CreateRequestOfferCommand : ICommand<Guid>
{
    public decimal Amount { get; set; }

    [MaxLength(20)]
    public string Status { get; set; } = "pending";

    public Guid RequestId { get; set; }

    public Guid ResponderId { get; set; }
}

internal sealed class CreateRequestOfferHandler : ICommandHandler<CreateRequestOfferCommand, Guid>
{
    private readonly IRepository<RequestOffer> _repository;
    private readonly IUnitOfWork _unitOfWork;

    public CreateRequestOfferHandler(IRepository<RequestOffer> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Guid> Handle(CreateRequestOfferCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = new RequestOffer
        {
            Amount = request.Amount,
            Status = request.Status,
            RequestId = request.RequestId,
            ResponderId = request.ResponderId,
        };
        await _repository.AddAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return entity.Id;
    }
}

/// <summary>Var olan bir RequestOffer kaydını günceller — CodeGen dışı, elle eklendi.</summary>
public sealed class UpdateRequestOfferCommand : ICommand
{
    public Guid Id { get; set; }
    public decimal Amount { get; set; }

    [MaxLength(20)]
    public string Status { get; set; } = "pending";

    public Guid RequestId { get; set; }

    public Guid ResponderId { get; set; }
}

internal sealed class UpdateRequestOfferHandler : ICommandHandler<UpdateRequestOfferCommand>
{
    private readonly IRepository<RequestOffer> _repository;
    private readonly IUnitOfWork _unitOfWork;

    public UpdateRequestOfferHandler(IRepository<RequestOffer> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(UpdateRequestOfferCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("RequestOffer", request.Id);
        entity.Amount = request.Amount;
        entity.Status = request.Status;
        entity.RequestId = request.RequestId;
        entity.ResponderId = request.ResponderId;
        await _repository.UpdateAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>Bir RequestOffer kaydını siler (teklifi geri çekme) — CodeGen dışı, elle eklendi.</summary>
public sealed class DeleteRequestOfferCommand : ICommand
{
    public Guid Id { get; set; }
}

internal sealed class DeleteRequestOfferHandler : ICommandHandler<DeleteRequestOfferCommand>
{
    private readonly IRepository<RequestOffer> _repository;
    private readonly IUnitOfWork _unitOfWork;

    public DeleteRequestOfferHandler(IRepository<RequestOffer> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(DeleteRequestOfferCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("RequestOffer", request.Id);
        await _repository.DeleteAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
