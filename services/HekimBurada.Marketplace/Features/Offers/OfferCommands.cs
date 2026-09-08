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

            var html = $"""
                <p>Merhaba,</p>
                <p><strong>"{listing.Title}"</strong> ilanınıza yeni bir teklif verildi.</p>
                <p>Teklifi görmek için ilan sayfanızı ziyaret edin.</p>
                """;
            await _emailSender.SendAsync(seller.Email, "HekimBurada — İlanınıza yeni bir teklif geldi", html, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Teklif e-postası gönderilemedi (SellerId: {SellerId}).", listing.SellerId);
        }
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
