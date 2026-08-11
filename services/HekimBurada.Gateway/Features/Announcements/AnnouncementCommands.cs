using System.ComponentModel.DataAnnotations;
using BaseForge.Core.CQRS;
using BaseForge.Core.Exceptions;
using BaseForge.Core.Interfaces;
using Gateway.Entities;

namespace Gateway.Features.Announcements;

/// <summary>Yeni bir Announcement oluşturur; üretilen kimliği döndürür.</summary>
public sealed class CreateAnnouncementCommand : ICommand<Guid>
{
    /// <summary>Title.</summary>
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    /// <summary>Body.</summary>
    public string Body { get; set; } = string.Empty;
    /// <summary>Duyuru görseli — CodeGen dışı, elle eklendi.</summary>
    public string? ImageUrl { get; set; }
    /// <summary>PublishedAt.</summary>
    public DateTimeOffset PublishedAt { get; set; }
    /// <summary>AuthorId.</summary>
    public Guid AuthorId { get; set; }
}

internal sealed class CreateAnnouncementHandler : ICommandHandler<CreateAnnouncementCommand, Guid>
{
    private readonly IRepository<Announcement> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public CreateAnnouncementHandler(IRepository<Announcement> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Guid> Handle(CreateAnnouncementCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = new Announcement
        {
            Title = request.Title,
            Body = request.Body,
            ImageUrl = request.ImageUrl,
            PublishedAt = request.PublishedAt,
            AuthorId = request.AuthorId,
        };
        await _repository.AddAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return entity.Id;
    }
}

/// <summary>Var olan bir Announcement kaydını günceller.</summary>
public sealed class UpdateAnnouncementCommand : ICommand
{
    /// <summary>Güncellenecek kaydın kimliği.</summary>
    public Guid Id { get; set; }
    /// <summary>Title.</summary>
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    /// <summary>Body.</summary>
    public string Body { get; set; } = string.Empty;
    /// <summary>Duyuru görseli — CodeGen dışı, elle eklendi.</summary>
    public string? ImageUrl { get; set; }
    /// <summary>PublishedAt.</summary>
    public DateTimeOffset PublishedAt { get; set; }
    /// <summary>AuthorId.</summary>
    public Guid AuthorId { get; set; }
}

internal sealed class UpdateAnnouncementHandler : ICommandHandler<UpdateAnnouncementCommand>
{
    private readonly IRepository<Announcement> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public UpdateAnnouncementHandler(IRepository<Announcement> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(UpdateAnnouncementCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Announcement", request.Id);
        entity.Title = request.Title;
        entity.Body = request.Body;
        entity.ImageUrl = request.ImageUrl;
        entity.PublishedAt = request.PublishedAt;
        entity.AuthorId = request.AuthorId;
        await _repository.UpdateAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>Bir Announcement kaydını siler (soft delete).</summary>
public sealed class DeleteAnnouncementCommand : ICommand
{
    /// <summary>Silinecek kaydın kimliği.</summary>
    public Guid Id { get; set; }
}

internal sealed class DeleteAnnouncementHandler : ICommandHandler<DeleteAnnouncementCommand>
{
    private readonly IRepository<Announcement> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public DeleteAnnouncementHandler(IRepository<Announcement> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(DeleteAnnouncementCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Announcement", request.Id);
        await _repository.DeleteAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
