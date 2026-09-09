using System.ComponentModel.DataAnnotations;
using BaseForge.Core.CQRS;
using BaseForge.Core.Exceptions;
using BaseForge.Core.Interfaces;
using Messaging.Email;
using Messaging.Entities;
using Messaging.Hubs;
using Messaging.Integration;
using Messaging.Presence;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace Messaging.Features.Messages;

/// <summary>Yeni bir Message oluşturur; üretilen kimliği döndürür.</summary>
public sealed class CreateMessageCommand : ICommand<Guid>
{
    /// <summary>Body.</summary>
    [MaxLength(2000)]
    public string Body { get; set; } = string.Empty;
    /// <summary>OfferId.</summary>
    public Guid OfferId { get; set; }
    /// <summary>SenderId.</summary>
    public Guid SenderId { get; set; }
    /// <summary>
    /// Bu sohbetteki KARŞI taraf — bildirimin kime gideceğini belirler. Offer entity'si Marketplace'te
    /// yaşadığı ve oradan buraya (henüz) gerçek bir gRPC köprüsü olmadığı için (bkz. Integration/
    /// OfferClient.cs stub notu) istemciden alınır: frontend zaten hem teklifin alıcısını hem ilanın
    /// satıcısını bildiğinden, "karşı taraf" bilgisini hesaplaması ek bir sorgu gerektirmiyor. Yanlış
    /// gönderilse bile tek sonucu birinin yanlışlıkla bildirim alması/almaması olur — güvenlik açığı
    /// değildir. CodeGen dışı, elle eklendi.
    /// </summary>
    public Guid RecipientId { get; set; }
    /// <summary>Bildirime tıklanınca gidilecek yol (örn. /ilanlar/{listingId}) — aynı gerekçeyle
    /// (Offer→Listing köprüsü burada yok) istemciden alınır, zaten sayfada elinde olan bir bilgi.</summary>
    [MaxLength(300)]
    public string LinkPath { get; set; } = string.Empty;
}

internal sealed class CreateMessageHandler : ICommandHandler<CreateMessageCommand, Guid>
{
    private readonly IRepository<Message> _repository;
    private readonly IRepository<Notification> _notificationRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IHubContext<MessageHub> _hub;
    private readonly IHubContext<PresenceHub> _presenceHub;
    private readonly IPresenceTracker _presenceTracker;
    private readonly IUserClient _userClient;
    private readonly IEmailSender _emailSender;
    private readonly ILogger<CreateMessageHandler> _logger;

    public CreateMessageHandler(
        IRepository<Message> repository,
        IRepository<Notification> notificationRepository,
        IUnitOfWork unitOfWork,
        IHubContext<MessageHub> hub,
        IHubContext<PresenceHub> presenceHub,
        IPresenceTracker presenceTracker,
        IUserClient userClient,
        IEmailSender emailSender,
        ILogger<CreateMessageHandler> logger)
    {
        _repository = repository;
        _notificationRepository = notificationRepository;
        _unitOfWork = unitOfWork;
        _hub = hub;
        _presenceHub = presenceHub;
        _presenceTracker = presenceTracker;
        _userClient = userClient;
        _emailSender = emailSender;
        _logger = logger;
    }

    public async Task<Guid> Handle(CreateMessageCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = new Message
        {
            Body = request.Body,
            OfferId = request.OfferId,
            SenderId = request.SenderId,
        };
        await _repository.AddAsync(entity, cancellationToken);

        // Kendine bildirim gönderilmez (RecipientId boş/senderId ile aynıysa atlanır).
        if (request.RecipientId != Guid.Empty && request.RecipientId != request.SenderId)
        {
            await _notificationRepository.AddAsync(new Notification
            {
                RecipientUserId = request.RecipientId,
                Title = "Yeni bir mesajınız var",
                Body = "Bir ilan teklifi hakkında yeni bir mesaj aldınız.",
                LinkPath = request.LinkPath,
            }, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // REST üzerinden yazılan mesaj, aynı Offer odasındaki bağlı istemcilere gerçek zamanlı iletilir
        // (bkz. Hubs/MessageHub.cs — CodeGen dışı, elle eklendi).
        await _hub.Clients.Group(MessageHub.GroupName(entity.OfferId))
            .SendAsync("messageReceived", MessageDto.From(entity), cancellationToken);

        if (request.RecipientId != Guid.Empty && request.RecipientId != request.SenderId)
        {
            await NotifyRecipientAsync(request, cancellationToken);
        }

        return entity.Id;
    }

    private async Task NotifyRecipientAsync(CreateMessageCommand request, CancellationToken cancellationToken)
    {
        const string title = "Yeni bir mesajınız var";
        const string body = "Bir ilan teklifi hakkında yeni bir mesaj aldınız.";
        var linkPath = request.LinkPath;

        var online = await _presenceTracker.IsOnlineAsync(request.RecipientId);
        if (online)
        {
            await _presenceHub.Clients.User(request.RecipientId.ToString())
                .SendAsync("notificationReceived", new { title, body, linkPath }, cancellationToken);
            return;
        }

        try
        {
            var recipient = await _userClient.GetByIdAsync(request.RecipientId, cancellationToken);
            if (recipient is null || string.IsNullOrWhiteSpace(recipient.Email))
            {
                return;
            }

            var html = EmailTemplate.Build("YENİ MESAJ", title, body, "Sohbeti Aç", $"https://hekimburada.com{linkPath}");
            await _emailSender.SendAsync(recipient.Email, "HekimBurada — " + title, html, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Mesaj e-postası gönderilemedi (RecipientId: {RecipientId}).", request.RecipientId);
        }
    }
}

/// <summary>Var olan bir Message kaydını günceller.</summary>
public sealed class UpdateMessageCommand : ICommand
{
    /// <summary>Güncellenecek kaydın kimliği.</summary>
    public Guid Id { get; set; }
    /// <summary>Body.</summary>
    [MaxLength(2000)]
    public string Body { get; set; } = string.Empty;
    /// <summary>OfferId.</summary>
    public Guid OfferId { get; set; }
    /// <summary>SenderId.</summary>
    public Guid SenderId { get; set; }
}

internal sealed class UpdateMessageHandler : ICommandHandler<UpdateMessageCommand>
{
    private readonly IRepository<Message> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public UpdateMessageHandler(IRepository<Message> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(UpdateMessageCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Message", request.Id);
        entity.Body = request.Body;
        entity.OfferId = request.OfferId;
        entity.SenderId = request.SenderId;
        await _repository.UpdateAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>Bir Message kaydını siler (soft delete).</summary>
public sealed class DeleteMessageCommand : ICommand
{
    /// <summary>Silinecek kaydın kimliği.</summary>
    public Guid Id { get; set; }
}

internal sealed class DeleteMessageHandler : ICommandHandler<DeleteMessageCommand>
{
    private readonly IRepository<Message> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public DeleteMessageHandler(IRepository<Message> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(DeleteMessageCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Message", request.Id);
        await _repository.DeleteAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>
/// Çağıranın bir Offer sohbetinde KARŞI taraftan gelen, henüz okunmamış mesajlarını okundu işaretler
/// — mesajlaşma gelen kutusundaki "okunmadı" sayacı ve gönderenin "görüldü" tiki için (bkz. proje
/// kararı). Her Offer sohbeti tam 2 kişili olduğundan "karşı taraf" = SenderId != ReaderId olan
/// mesajlar. CodeGen dışı, elle eklendi.
/// </summary>
public sealed class MarkMessagesReadCommand : ICommand
{
    public Guid OfferId { get; set; }
    public Guid ReaderId { get; set; }
}

internal sealed class MarkMessagesReadHandler : ICommandHandler<MarkMessagesReadCommand>
{
    private readonly IRepository<Message> _repository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IHubContext<MessageHub> _hub;

    public MarkMessagesReadHandler(IRepository<Message> repository, IUnitOfWork unitOfWork, IHubContext<MessageHub> hub)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
        _hub = hub;
    }

    public async Task Handle(MarkMessagesReadCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var (unread, _) = await _repository.ListPagedAsync(
            0,
            500,
            null,
            query => query.Where(x => x.OfferId == request.OfferId && x.SenderId != request.ReaderId && x.ReadAt == null),
            cancellationToken);

        if (unread.Count == 0)
        {
            return;
        }

        var readAt = DateTimeOffset.UtcNow;
        foreach (var message in unread)
        {
            message.ReadAt = readAt;
            await _repository.UpdateAsync(message, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Gönderene "görüldü" tikini canlı göstermek için — bkz. Hubs/MessageHub.cs.
        await _hub.Clients.Group(MessageHub.GroupName(request.OfferId))
            .SendAsync("messagesRead", new { offerId = request.OfferId, readAt }, cancellationToken);
    }
}
