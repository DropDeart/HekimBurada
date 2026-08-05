using System.ComponentModel.DataAnnotations;
using BaseForge.Core.CQRS;
using BaseForge.Core.Exceptions;
using BaseForge.Core.Interfaces;
using Marketplace.Entities;
using Marketplace.Integration;

namespace Marketplace.Features.Requests;

/// <summary>Yeni bir Request oluşturur; üretilen kimliği döndürür.</summary>
public sealed class CreateRequestCommand : ICommand<Guid>
{
    /// <summary>Title.</summary>
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    /// <summary>Description.</summary>
    public string Description { get; set; } = string.Empty;
    /// <summary>BudgetMax.</summary>
    public decimal? BudgetMax { get; set; }
    /// <summary>Status.</summary>
    [MaxLength(20)]
    public string Status { get; set; } = "open";
    /// <summary>CategoryId.</summary>
    public Guid CategoryId { get; set; }
    /// <summary>RequesterId.</summary>
    public Guid RequesterId { get; set; }
}

internal sealed class CreateRequestHandler : ICommandHandler<CreateRequestCommand, Guid>
{
    private readonly IRepository<Request> _repository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IUserClient _userClient;
    public CreateRequestHandler(IRepository<Request> repository, IUnitOfWork unitOfWork, IUserClient userClient)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
        _userClient = userClient;
    }

    public async Task<Guid> Handle(CreateRequestCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await VerificationGate.EnsureApprovedAsync(_userClient, request.RequesterId, cancellationToken);
        var entity = new Request
        {
            Title = request.Title,
            Description = request.Description,
            BudgetMax = request.BudgetMax,
            Status = request.Status,
            CategoryId = request.CategoryId,
            RequesterId = request.RequesterId,
        };
        await _repository.AddAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return entity.Id;
    }
}

/// <summary>Var olan bir Request kaydını günceller.</summary>
public sealed class UpdateRequestCommand : ICommand
{
    /// <summary>Güncellenecek kaydın kimliği.</summary>
    public Guid Id { get; set; }
    /// <summary>Title.</summary>
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    /// <summary>Description.</summary>
    public string Description { get; set; } = string.Empty;
    /// <summary>BudgetMax.</summary>
    public decimal? BudgetMax { get; set; }
    /// <summary>Status.</summary>
    [MaxLength(20)]
    public string Status { get; set; } = "open";
    /// <summary>CategoryId.</summary>
    public Guid CategoryId { get; set; }
    /// <summary>RequesterId.</summary>
    public Guid RequesterId { get; set; }
}

internal sealed class UpdateRequestHandler : ICommandHandler<UpdateRequestCommand>
{
    private readonly IRepository<Request> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public UpdateRequestHandler(IRepository<Request> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(UpdateRequestCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Request", request.Id);
        entity.Title = request.Title;
        entity.Description = request.Description;
        entity.BudgetMax = request.BudgetMax;
        entity.Status = request.Status;
        entity.CategoryId = request.CategoryId;
        entity.RequesterId = request.RequesterId;
        await _repository.UpdateAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>Bir Request kaydını siler (soft delete).</summary>
public sealed class DeleteRequestCommand : ICommand
{
    /// <summary>Silinecek kaydın kimliği.</summary>
    public Guid Id { get; set; }
}

internal sealed class DeleteRequestHandler : ICommandHandler<DeleteRequestCommand>
{
    private readonly IRepository<Request> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public DeleteRequestHandler(IRepository<Request> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(DeleteRequestCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Request", request.Id);
        await _repository.DeleteAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
