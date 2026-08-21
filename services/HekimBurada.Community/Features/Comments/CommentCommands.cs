using System.ComponentModel.DataAnnotations;
using BaseForge.Core.CQRS;
using BaseForge.Core.Exceptions;
using BaseForge.Core.Interfaces;
using Community.Email;
using Community.Entities;
using Community.Integration;
using Microsoft.Extensions.Logging;

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
    /// <summary>Yanıtladığı yorum — null ise üst seviye yorum. CodeGen dışı, elle eklendi.</summary>
    public Guid? ParentId { get; set; }
}

internal sealed class CreateCommentHandler : ICommandHandler<CreateCommentCommand, Guid>
{
    private readonly IRepository<Comment> _repository;
    private readonly IRepository<Topic> _topicRepository;
    private readonly IRepository<Notification> _notificationRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IUserClient _userClient;
    private readonly IEmailSender _emailSender;
    private readonly ILogger<CreateCommentHandler> _logger;

    public CreateCommentHandler(
        IRepository<Comment> repository,
        IRepository<Topic> topicRepository,
        IRepository<Notification> notificationRepository,
        IUnitOfWork unitOfWork,
        IUserClient userClient,
        IEmailSender emailSender,
        ILogger<CreateCommentHandler> logger)
    {
        _repository = repository;
        _topicRepository = topicRepository;
        _notificationRepository = notificationRepository;
        _unitOfWork = unitOfWork;
        _userClient = userClient;
        _emailSender = emailSender;
        _logger = logger;
    }

    public async Task<Guid> Handle(CreateCommentCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = new Comment
        {
            Body = request.Body,
            TopicId = request.TopicId,
            AuthorId = request.AuthorId,
            ParentId = request.ParentId,
        };
        await _repository.AddAsync(entity, cancellationToken);

        // Konu yazarına ve (yanıtsa) yanıtlanan yorumun yazarına bildirim + e-posta — kendine
        // bildirim gönderilmez, aynı kişiye iki kez gönderilmez. Bildirim/e-posta başarısız olsa da
        // yorum kaydı geri alınmaz (best-effort). CodeGen dışı, elle eklendi.
        var topic = await _topicRepository.GetByIdAsync(request.TopicId, cancellationToken);
        var parent = request.ParentId is { } parentId
            ? await _repository.GetByIdAsync(parentId, cancellationToken)
            : null;

        var recipients = new HashSet<Guid>();
        if (topic is not null && topic.AuthorId != request.AuthorId)
        {
            recipients.Add(topic.AuthorId);
        }

        if (parent is not null && parent.AuthorId != request.AuthorId)
        {
            recipients.Add(parent.AuthorId);
        }

        if (topic is not null)
        {
            foreach (var recipientId in recipients)
            {
                var isReplyToRecipient = parent is not null && parent.AuthorId == recipientId;
                await _notificationRepository.AddAsync(new Notification
                {
                    RecipientUserId = recipientId,
                    Title = isReplyToRecipient ? "Yorumunuza yanıt geldi" : "Konunuza yeni bir yorum geldi",
                    Body = $"\"{topic.Title}\" konusunda {(isReplyToRecipient ? "yorumunuza bir yanıt yazıldı." : "yeni bir yorum yazıldı.")}",
                    LinkPath = $"/topluluk/{topic.CategoryId}/{topic.Id}",
                }, cancellationToken);
            }
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (topic is not null)
        {
            foreach (var recipientId in recipients)
            {
                var isReplyToRecipient = parent is not null && parent.AuthorId == recipientId;
                await NotifyByEmailAsync(recipientId, topic, request, isReplyToRecipient, cancellationToken);
            }
        }

        return entity.Id;
    }

    private async Task NotifyByEmailAsync(
        Guid recipientId,
        Topic topic,
        CreateCommentCommand request,
        bool isReply,
        CancellationToken cancellationToken)
    {
        try
        {
            var recipient = await _userClient.GetByIdAsync(recipientId, cancellationToken);
            if (recipient is null || string.IsNullOrWhiteSpace(recipient.Email))
            {
                return;
            }

            var author = await _userClient.GetByIdAsync(request.AuthorId, cancellationToken);
            var authorName = author?.FullName is { Length: > 0 } fullName ? fullName : "Bir meslektaşınız";
            var actionText = isReply ? "yorumunuza bir yanıt yazdı" : "konunuza yeni bir yorum yazdı";
            var html = $"""
                <p>Merhaba,</p>
                <p><strong>{authorName}</strong>, <strong>"{topic.Title}"</strong> {actionText}.</p>
                <p>Yorumu görmek için topluluk sayfasını ziyaret edin.</p>
                """;
            var subject = isReply ? "HekimBurada — Yorumunuza yanıt geldi" : "HekimBurada — Konunuza yeni bir yorum geldi";
            await _emailSender.SendAsync(recipient.Email, subject, html, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Yorum bildirim e-postası gönderilemedi (TopicId: {TopicId}).", topic.Id);
        }
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
