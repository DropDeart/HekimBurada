using System.ComponentModel.DataAnnotations;
using BaseForge.Core.CQRS;
using BaseForge.Core.Exceptions;
using BaseForge.Core.Interfaces;
using Community.Entities;
using Community.Integration;

namespace Community.Features.Topics;

/// <summary>Yeni bir Topic oluşturur; üretilen kimliği döndürür.</summary>
public sealed class CreateTopicCommand : ICommand<Guid>
{
    /// <summary>Title.</summary>
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    /// <summary>Body.</summary>
    public string Body { get; set; } = string.Empty;
    /// <summary>ViewCount.</summary>
    public int ViewCount { get; set; } = 0;
    /// <summary>IsPinned.</summary>
    public bool IsPinned { get; set; } = false;
    /// <summary>IsLocked.</summary>
    public bool IsLocked { get; set; } = false;
    /// <summary>CategoryId.</summary>
    public Guid CategoryId { get; set; }
    /// <summary>AuthorId.</summary>
    public Guid AuthorId { get; set; }
}

internal sealed class CreateTopicHandler : ICommandHandler<CreateTopicCommand, Guid>
{
    private readonly IRepository<Topic> _repository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IUserClient _userClient;
    public CreateTopicHandler(IRepository<Topic> repository, IUnitOfWork unitOfWork, IUserClient userClient)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
        _userClient = userClient;
    }

    public async Task<Guid> Handle(CreateTopicCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await VerificationGate.EnsureApprovedAsync(_userClient, request.AuthorId, cancellationToken);
        var entity = new Topic
        {
            Title = request.Title,
            Body = request.Body,
            ViewCount = request.ViewCount,
            IsPinned = request.IsPinned,
            IsLocked = request.IsLocked,
            CategoryId = request.CategoryId,
            AuthorId = request.AuthorId,
        };
        await _repository.AddAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return entity.Id;
    }
}

/// <summary>Var olan bir Topic kaydını günceller.</summary>
public sealed class UpdateTopicCommand : ICommand
{
    /// <summary>Güncellenecek kaydın kimliği.</summary>
    public Guid Id { get; set; }
    /// <summary>Title.</summary>
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    /// <summary>Body.</summary>
    public string Body { get; set; } = string.Empty;
    /// <summary>ViewCount.</summary>
    public int ViewCount { get; set; } = 0;
    /// <summary>IsPinned.</summary>
    public bool IsPinned { get; set; } = false;
    /// <summary>IsLocked.</summary>
    public bool IsLocked { get; set; } = false;
    /// <summary>CategoryId.</summary>
    public Guid CategoryId { get; set; }
    /// <summary>AuthorId.</summary>
    public Guid AuthorId { get; set; }
}

internal sealed class UpdateTopicHandler : ICommandHandler<UpdateTopicCommand>
{
    private readonly IRepository<Topic> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public UpdateTopicHandler(IRepository<Topic> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(UpdateTopicCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Topic", request.Id);
        entity.Title = request.Title;
        entity.Body = request.Body;
        entity.ViewCount = request.ViewCount;
        entity.IsPinned = request.IsPinned;
        entity.IsLocked = request.IsLocked;
        entity.CategoryId = request.CategoryId;
        entity.AuthorId = request.AuthorId;
        await _repository.UpdateAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>Bir Topic kaydını siler (soft delete).</summary>
public sealed class DeleteTopicCommand : ICommand
{
    /// <summary>Silinecek kaydın kimliği.</summary>
    public Guid Id { get; set; }
}

internal sealed class DeleteTopicHandler : ICommandHandler<DeleteTopicCommand>
{
    private readonly IRepository<Topic> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public DeleteTopicHandler(IRepository<Topic> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(DeleteTopicCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Topic", request.Id);
        await _repository.DeleteAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>Topic'ın ViewCount sayacını bir artırır.</summary>
public sealed class IncrementTopicViewCountCommand : ICommand
{
    /// <summary>Kaydın kimliği.</summary>
    public Guid Id { get; set; }
}

internal sealed class IncrementTopicViewCountHandler : ICommandHandler<IncrementTopicViewCountCommand>
{
    private readonly IRepository<Topic> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public IncrementTopicViewCountHandler(IRepository<Topic> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(IncrementTopicViewCountCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Topic", request.Id);
        entity.ViewCount++;
        await _repository.UpdateAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
