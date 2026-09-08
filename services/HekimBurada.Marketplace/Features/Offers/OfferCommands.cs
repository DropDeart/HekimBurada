using System.ComponentModel.DataAnnotations;
using BaseForge.Core.CQRS;
using BaseForge.Core.Exceptions;
using BaseForge.Core.Interfaces;
using Marketplace.Email;
using Marketplace.Entities;
using Marketplace.Integration;
using Microsoft.Extensions.Logging;

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
    private readonly IRepository<Listing> _listingRepository;
    private readonly IRepository<Notification> _notificationRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IUserClient _userClient;
    private readonly IPresenceClient _presenceClient;
    private readonly IEmailSender _emailSender;
    private readonly ILogger<CreateOfferHandler> _logger;

    public CreateOfferHandler(
        IRepository<Offer> repository,
        IRepository<Listing> listingRepository,
        IRepository<Notification> notificationRepository,
        IUnitOfWork unitOfWork,
        IUserClient userClient,
        IPresenceClient presenceClient,
        IEmailSender emailSender,
        ILogger<CreateOfferHandler> logger)
    {
        _repository = repository;
        _listingRepository = listingRepository;
        _notificationRepository = notificationRepository;
        _unitOfWork = unitOfWork;
        _userClient = userClient;
        _presenceClient = presenceClient;
        _emailSender = emailSender;
        _logger = logger;
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

        // Satıcıya bildirim: önce Messaging'e sorulur (çevrimiçiyse anlık SignalR push yapıp
        // bildirim çanına da yazar), çevrimdışıysa (ya da Messaging'e ulaşılamadıysa) e-posta ile
        // tamamlanır. Kendi ilanına teklif verilmesi (olmamalı ama savunma amaçlı) hariç tutulur.
        // CodeGen dışı, elle eklendi (bkz. proje kararı).
        var listing = await _listingRepository.GetByIdAsync(request.ListingId, cancellationToken);
        if (listing is not null && listing.SellerId != request.BuyerId)
        {
            await _notificationRepository.AddAsync(new Notification
            {
                RecipientUserId = listing.SellerId,
                Title = "İlanınıza yeni bir teklif geldi",
                Body = $"\"{listing.Title}\" ilanınıza yeni bir teklif verildi.",
                LinkPath = $"/ilanlar/{listing.Id}",
            }, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (listing is not null && listing.SellerId != request.BuyerId)
        {
            await NotifySellerAsync(listing, cancellationToken);
        }

        return entity.Id;
    }

    private async Task NotifySellerAsync(Listing listing, CancellationToken cancellationToken)
    {
        var title = "İlanınıza yeni bir teklif geldi";
        var body = $"\"{listing.Title}\" ilanınıza yeni bir teklif verildi.";
        var linkPath = $"/ilanlar/{listing.Id}";

        var deliveredLive = await _presenceClient.NotifyAsync(listing.SellerId, title, body, linkPath, cancellationToken);
        if (deliveredLive)
        {
            return;
        }

        try
        {
            var seller = await _userClient.GetByIdAsync(listing.SellerId, cancellationToken);
            if (seller is null || string.IsNullOrWhiteSpace(seller.Email))
            {
                return;
            }

            var html = EmailTemplate.Build("YENİ TEKLİF", title, $"<strong>\"{listing.Title}\"</strong> ilanınıza yeni bir teklif verildi.", "Teklifi Görüntüle", $"https://hekimburada.com{linkPath}");
            await _emailSender.SendAsync(seller.Email, "HekimBurada — " + title, html, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Teklif e-postası gönderilemedi (SellerId: {SellerId}).", listing.SellerId);
        }
    }
}

/// <summary>Var olan bir Offer kaydını günceller — yalnızca Amount (alıcı, kararsızken teklifini
/// revize edebilsin diye). Status BİLEREK burada değiştirilemez — kabul/red, altlarında yan etkileri
/// (ilanı 'sold' yapmak, diğer teklifleri otomatik reddetmek, bildirim/e-posta) olan AcceptOfferCommand/
/// RejectOfferCommand üzerinden yapılmalı (bkz. proje kararı, aşağıda).</summary>
public sealed class UpdateOfferCommand : ICommand
{
    /// <summary>Güncellenecek kaydın kimliği.</summary>
    public Guid Id { get; set; }
    /// <summary>Amount.</summary>
    public decimal Amount { get; set; }
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
        entity.ListingId = request.ListingId;
        entity.BuyerId = request.BuyerId;
        await _repository.UpdateAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>
/// Satıcının 'pending' bir teklifi kabul etmesi — CodeGen dışı, elle eklendi (bkz. proje kararı).
/// Önceden hiçbir yan etkisi yoktu: ilan yayında/teklife açık kalmaya devam ediyor, diğer bekleyen
/// teklifler asılı kalıyordu. Artık: ilan 'sold' olur (public listeden/yeni tekliften düşer), aynı
/// ilandaki diğer TÜM bekleyen teklifler otomatik reddedilir ve o alıcılara + kabul edilen alıcıya
/// bildirim + (çevrimdışıysa) e-posta gider.
/// </summary>
public sealed class AcceptOfferCommand : ICommand
{
    public Guid Id { get; set; }
}

internal sealed class AcceptOfferHandler : ICommandHandler<AcceptOfferCommand>
{
    private readonly IRepository<Offer> _repository;
    private readonly IRepository<Listing> _listingRepository;
    private readonly IRepository<Notification> _notificationRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IUserClient _userClient;
    private readonly IPresenceClient _presenceClient;
    private readonly IEmailSender _emailSender;
    private readonly ILogger<AcceptOfferHandler> _logger;

    public AcceptOfferHandler(
        IRepository<Offer> repository,
        IRepository<Listing> listingRepository,
        IRepository<Notification> notificationRepository,
        IUnitOfWork unitOfWork,
        IUserClient userClient,
        IPresenceClient presenceClient,
        IEmailSender emailSender,
        ILogger<AcceptOfferHandler> logger)
    {
        _repository = repository;
        _listingRepository = listingRepository;
        _notificationRepository = notificationRepository;
        _unitOfWork = unitOfWork;
        _userClient = userClient;
        _presenceClient = presenceClient;
        _emailSender = emailSender;
        _logger = logger;
    }

    public async Task Handle(AcceptOfferCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Offer", request.Id);

        if (entity.Status != "pending")
        {
            throw new BaseForge.Core.Exceptions.ValidationException("Status", "Yalnızca 'pending' durumundaki teklifler kabul edilebilir.");
        }

        var listing = await _listingRepository.GetByIdAsync(entity.ListingId, cancellationToken)
            ?? throw new NotFoundException("Listing", entity.ListingId);

        entity.Status = "accepted";
        await _repository.UpdateAsync(entity, cancellationToken);

        listing.Status = "sold";
        await _listingRepository.UpdateAsync(listing, cancellationToken);

        var (otherPending, _) = await _repository.ListPagedAsync(
            0,
            500,
            null,
            query => query.Where(x => x.ListingId == entity.ListingId && x.Status == "pending" && x.Id != entity.Id),
            cancellationToken);

        foreach (var other in otherPending)
        {
            other.Status = "rejected";
            await _repository.UpdateAsync(other, cancellationToken);
        }

        await _notificationRepository.AddAsync(new Notification
        {
            RecipientUserId = entity.BuyerId,
            Title = "Teklifiniz kabul edildi",
            Body = $"\"{listing.Title}\" ilanı için teklifiniz kabul edildi.",
            LinkPath = $"/ilanlar/{listing.Id}",
        }, cancellationToken);

        foreach (var other in otherPending)
        {
            await _notificationRepository.AddAsync(new Notification
            {
                RecipientUserId = other.BuyerId,
                Title = "İlan başka bir alıcıya satıldı",
                Body = $"\"{listing.Title}\" ilanı için verdiğiniz teklif, ilan başka bir alıcıya satıldığı için reddedildi.",
                LinkPath = $"/ilanlar/{listing.Id}",
            }, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await NotifyUserAsync(entity.BuyerId, "Teklifiniz kabul edildi", $"\"{listing.Title}\" ilanı için teklifiniz kabul edildi.", $"/ilanlar/{listing.Id}", cancellationToken);
        foreach (var other in otherPending)
        {
            await NotifyUserAsync(
                other.BuyerId,
                "İlan başka bir alıcıya satıldı",
                $"\"{listing.Title}\" ilanı için verdiğiniz teklif, ilan başka bir alıcıya satıldığı için reddedildi.",
                $"/ilanlar/{listing.Id}",
                cancellationToken);
        }
    }

    private async Task NotifyUserAsync(Guid userId, string title, string body, string linkPath, CancellationToken cancellationToken)
    {
        var deliveredLive = await _presenceClient.NotifyAsync(userId, title, body, linkPath, cancellationToken);
        if (deliveredLive)
        {
            return;
        }

        try
        {
            var user = await _userClient.GetByIdAsync(userId, cancellationToken);
            if (user is null || string.IsNullOrWhiteSpace(user.Email))
            {
                return;
            }

            var html = EmailTemplate.Build("TEKLİF DURUMU", title, body, "İlanı Görüntüle", $"https://hekimburada.com{linkPath}");
            await _emailSender.SendAsync(user.Email, "HekimBurada — " + title, html, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Bildirim e-postası gönderilemedi (UserId: {UserId}).", userId);
        }
    }
}

/// <summary>Satıcının 'pending' bir teklifi (kabul etmeden) reddetmesi — CodeGen dışı, elle eklendi.
/// Kabulün aksine ilanı/diğer teklifleri etkilemez, sadece bu tek teklifi kapatır ve alıcıya bildirir.</summary>
public sealed class RejectOfferCommand : ICommand
{
    public Guid Id { get; set; }
}

internal sealed class RejectOfferHandler : ICommandHandler<RejectOfferCommand>
{
    private readonly IRepository<Offer> _repository;
    private readonly IRepository<Listing> _listingRepository;
    private readonly IRepository<Notification> _notificationRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IUserClient _userClient;
    private readonly IPresenceClient _presenceClient;
    private readonly IEmailSender _emailSender;
    private readonly ILogger<RejectOfferHandler> _logger;

    public RejectOfferHandler(
        IRepository<Offer> repository,
        IRepository<Listing> listingRepository,
        IRepository<Notification> notificationRepository,
        IUnitOfWork unitOfWork,
        IUserClient userClient,
        IPresenceClient presenceClient,
        IEmailSender emailSender,
        ILogger<RejectOfferHandler> logger)
    {
        _repository = repository;
        _listingRepository = listingRepository;
        _notificationRepository = notificationRepository;
        _unitOfWork = unitOfWork;
        _userClient = userClient;
        _presenceClient = presenceClient;
        _emailSender = emailSender;
        _logger = logger;
    }

    public async Task Handle(RejectOfferCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Offer", request.Id);

        if (entity.Status != "pending")
        {
            throw new BaseForge.Core.Exceptions.ValidationException("Status", "Yalnızca 'pending' durumundaki teklifler reddedilebilir.");
        }

        entity.Status = "rejected";
        await _repository.UpdateAsync(entity, cancellationToken);

        var listing = await _listingRepository.GetByIdAsync(entity.ListingId, cancellationToken);
        if (listing is not null)
        {
            await _notificationRepository.AddAsync(new Notification
            {
                RecipientUserId = entity.BuyerId,
                Title = "Teklifiniz reddedildi",
                Body = $"\"{listing.Title}\" ilanı için verdiğiniz teklif satıcı tarafından reddedildi.",
                LinkPath = $"/ilanlar/{listing.Id}",
            }, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (listing is not null)
        {
            var deliveredLive = await _presenceClient.NotifyAsync(
                entity.BuyerId, "Teklifiniz reddedildi", $"\"{listing.Title}\" ilanı için verdiğiniz teklif satıcı tarafından reddedildi.", $"/ilanlar/{listing.Id}", cancellationToken);
            if (!deliveredLive)
            {
                try
                {
                    var buyer = await _userClient.GetByIdAsync(entity.BuyerId, cancellationToken);
                    if (buyer is not null && !string.IsNullOrWhiteSpace(buyer.Email))
                    {
                        var html = EmailTemplate.Build("TEKLİF DURUMU", "Teklifiniz reddedildi", $"\"{listing.Title}\" ilanı için verdiğiniz teklif satıcı tarafından reddedildi.", "İlanı Görüntüle", $"https://hekimburada.com/ilanlar/{listing.Id}");
                        await _emailSender.SendAsync(buyer.Email, "HekimBurada — Teklifiniz reddedildi", html, cancellationToken);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Ret e-postası gönderilemedi (BuyerId: {BuyerId}).", entity.BuyerId);
                }
            }
        }
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
