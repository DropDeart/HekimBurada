using System.ComponentModel.DataAnnotations;
using BaseForge.Core.CQRS;
using BaseForge.Core.Exceptions;
using BaseForge.Core.Interfaces;
using Community.Entities;

namespace Community.Features.Likes;

/// <summary>Yeni bir Like oluşturur; üretilen kimliği döndürür. TopicId/CommentId'den tam biri set
/// edilmeli (bkz. handler doğrulaması) — CodeGen dışı, elle eklendi.</summary>
public sealed class CreateLikeCommand : ICommand<Guid>
{
    /// <summary>TopicId — konu beğenisiyse dolu.</summary>
    public Guid? TopicId { get; set; }
    /// <summary>CommentId — yorum/yanıt beğenisiyse dolu. CodeGen dışı, elle eklendi.</summary>
    public Guid? CommentId { get; set; }
    /// <summary>AuthorId.</summary>
    public Guid AuthorId { get; set; }
}

internal sealed class CreateLikeHandler : ICommandHandler<CreateLikeCommand, Guid>
{
    private readonly IRepository<Like> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public CreateLikeHandler(IRepository<Like> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Guid> Handle(CreateLikeCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        EnsureExactlyOneTarget(request.TopicId, request.CommentId);
        var entity = new Like
        {
            TopicId = request.TopicId,
            CommentId = request.CommentId,
            AuthorId = request.AuthorId,
        };
        await _repository.AddAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return entity.Id;
    }

    /// <summary>Bir Like tam olarak bir hedefi (Topic YA DA Comment) işaretlemeli — CodeGen dışı, elle
    /// eklendi.</summary>
    internal static void EnsureExactlyOneTarget(Guid? topicId, Guid? commentId)
    {
        if (topicId is null == commentId is null)
        {
            throw new BaseForge.Core.Exceptions.ValidationException(
                nameof(CreateLikeCommand.TopicId),
                "Bir beğeni tam olarak bir konuyu ya da bir yorumu işaretlemeli.");
        }
    }
}

/// <summary>Var olan bir Like kaydını günceller.</summary>
public sealed class UpdateLikeCommand : ICommand
{
    /// <summary>Güncellenecek kaydın kimliği.</summary>
    public Guid Id { get; set; }
    /// <summary>TopicId — konu beğenisiyse dolu.</summary>
    public Guid? TopicId { get; set; }
    /// <summary>CommentId — yorum/yanıt beğenisiyse dolu. CodeGen dışı, elle eklendi.</summary>
    public Guid? CommentId { get; set; }
    /// <summary>AuthorId.</summary>
    public Guid AuthorId { get; set; }
}

internal sealed class UpdateLikeHandler : ICommandHandler<UpdateLikeCommand>
{
    private readonly IRepository<Like> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public UpdateLikeHandler(IRepository<Like> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(UpdateLikeCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        CreateLikeHandler.EnsureExactlyOneTarget(request.TopicId, request.CommentId);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Like", request.Id);
        entity.TopicId = request.TopicId;
        entity.CommentId = request.CommentId;
        entity.AuthorId = request.AuthorId;
        await _repository.UpdateAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>Bir Like kaydını siler (soft delete).</summary>
public sealed class DeleteLikeCommand : ICommand
{
    /// <summary>Silinecek kaydın kimliği.</summary>
    public Guid Id { get; set; }
}

internal sealed class DeleteLikeHandler : ICommandHandler<DeleteLikeCommand>
{
    private readonly IRepository<Like> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public DeleteLikeHandler(IRepository<Like> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(DeleteLikeCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Like", request.Id);
        await _repository.DeleteAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
