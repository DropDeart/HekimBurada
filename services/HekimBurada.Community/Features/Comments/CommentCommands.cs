using System.ComponentModel.DataAnnotations;
using BaseForge.Core.CQRS;
using BaseForge.Core.Exceptions;
using BaseForge.Core.Interfaces;
using Community.Entities;

namespace Community.Features.Comments;

/// <summary>Yeni bir Comment oluşturur; üretilen kimliği döndürür.</summary>
public sealed class CreateCommentCommand : ICommand<Guid>
{
    /// <summary>Body.</summary>
    public string Body { get; set; } = string.Empty;
    /// <summary>TopicId.</summary>
    public Guid TopicId { get; set; }
    /// <summary>AuthorId.</summary>
    public Guid AuthorId { get; set; }
}

internal sealed class CreateCommentHandler : ICommandHandler<CreateCommentCommand, Guid>
{
    private readonly IRepository<Comment> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public CreateCommentHandler(IRepository<Comment> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Guid> Handle(CreateCommentCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = new Comment
        {
            Body = request.Body,
            TopicId = request.TopicId,
            AuthorId = request.AuthorId,
        };
        await _repository.AddAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return entity.Id;
    }
}

/// <summary>Var olan bir Comment kaydını günceller.</summary>
public sealed class UpdateCommentCommand : ICommand
{
    /// <summary>Güncellenecek kaydın kimliği.</summary>
    public Guid Id { get; set; }
    /// <summary>Body.</summary>
    public string Body { get; set; } = string.Empty;
    /// <summary>TopicId.</summary>
    public Guid TopicId { get; set; }
    /// <summary>AuthorId.</summary>
    public Guid AuthorId { get; set; }
}

internal sealed class UpdateCommentHandler : ICommandHandler<UpdateCommentCommand>
{
    private readonly IRepository<Comment> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public UpdateCommentHandler(IRepository<Comment> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(UpdateCommentCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Comment", request.Id);
        entity.Body = request.Body;
        entity.TopicId = request.TopicId;
        entity.AuthorId = request.AuthorId;
        await _repository.UpdateAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>Bir Comment kaydını siler (soft delete).</summary>
public sealed class DeleteCommentCommand : ICommand
{
    /// <summary>Silinecek kaydın kimliği.</summary>
    public Guid Id { get; set; }
}

internal sealed class DeleteCommentHandler : ICommandHandler<DeleteCommentCommand>
{
    private readonly IRepository<Comment> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public DeleteCommentHandler(IRepository<Comment> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(DeleteCommentCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Comment", request.Id);
        await _repository.DeleteAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
