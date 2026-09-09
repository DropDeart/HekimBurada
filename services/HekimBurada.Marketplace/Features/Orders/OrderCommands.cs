using System.ComponentModel.DataAnnotations;
using BaseForge.Core.CQRS;
using BaseForge.Core.Exceptions;
using BaseForge.Core.Interfaces;
using Marketplace.Email;
using Marketplace.Entities;
using Marketplace.Integration;
using Microsoft.Extensions.Logging;

namespace Marketplace.Features.Orders;

/// <summary>
/// Bir ilan için yeni bir sipariş oluşturur — CodeGen dışı, elle eklendi. Ödeme yöntemine göre yalnızca
/// ilgili alanlar dolu olmalı (controller'da BuyerId/SellerId/Amount ezilir). "kart" için hiçbir kart
/// bilgisi (numara/son kullanma/CVC) toplanmıyor — bu alanlar bilerek modelde yok, bkz. Order.cs.
/// </summary>
public sealed class CreateOrderCommand : ICommand<Guid>
{
    public Guid ListingId { get; set; }
    public Guid BuyerId { get; set; }
    public Guid SellerId { get; set; }
    [MaxLength(20)]
    public string PaymentMethod { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    [MaxLength(200)]
    public string? DonationOrganization { get; set; }
    [MaxLength(500)]
    public string? DonationReceiptUrl { get; set; }
    [MaxLength(500)]
    public string? BuyerReferansUrl { get; set; }
    [MaxLength(500)]
    public string? DeliveryNote { get; set; }
}

internal sealed class CreateOrderHandler : ICommandHandler<CreateOrderCommand, Guid>
{
    private static readonly HashSet<string> AllowedMethods = new(StringComparer.Ordinal)
    {
        "bagis", "bedelsiz", "referans", "kart", "elden",
    };

    private readonly IRepository<Order> _repository;
    private readonly IRepository<Listing> _listingRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CreateOrderHandler(IRepository<Order> repository, IRepository<Listing> listingRepository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _listingRepository = listingRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Guid> Handle(CreateOrderCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (!AllowedMethods.Contains(request.PaymentMethod))
        {
            throw new BaseForge.Core.Exceptions.ValidationException("PaymentMethod", "Geçersiz ödeme yöntemi.");
        }

        // Bağış dekontu olmadan sipariş oluşturulamaz — satıcı/admin bağışın gerçekten yapıldığını
        // görmeden onaylamamalı, bkz. proje kararı. İstemci (buton disabled) bunu zaten engelliyor,
        // burada doğrudan API çağrısıyla atlanmasına karşı ikinci bir kapı.
        if (request.PaymentMethod == "bagis" &&
            (string.IsNullOrWhiteSpace(request.DonationOrganization) || string.IsNullOrWhiteSpace(request.DonationReceiptUrl)))
        {
            throw new BaseForge.Core.Exceptions.ValidationException(
                "DonationReceiptUrl", "Bağış ile ödemede kuruluş adı ve dekont yüklemesi zorunludur.");
        }

        var listing = await _listingRepository.GetByIdAsync(request.ListingId, cancellationToken)
            ?? throw new NotFoundException("Listing", request.ListingId);

        var entity = new Order
        {
            ListingId = request.ListingId,
            BuyerId = request.BuyerId,
            SellerId = listing.SellerId,
            PaymentMethod = request.PaymentMethod,
            Amount = request.Amount,
            Status = "pending",
            DonationOrganization = request.PaymentMethod == "bagis" ? request.DonationOrganization : null,
            DonationReceiptUrl = request.PaymentMethod == "bagis" ? request.DonationReceiptUrl : null,
            BuyerReferansUrl = request.PaymentMethod == "referans" ? request.BuyerReferansUrl : null,
            DeliveryNote = request.PaymentMethod == "elden" ? request.DeliveryNote : null,
        };
        await _repository.AddAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return entity.Id;
    }
}

/// <summary>Satıcının siparişi kargoya verdiğini işaretlemesi — kargo firması/takip no opsiyonel
/// (ör. "elden" teslimde kargo yok, doğrudan DeliverOrderCommand'a geçilir). CodeGen dışı, elle eklendi.</summary>
public sealed class ShipOrderCommand : ICommand
{
    public Guid Id { get; set; }
    [MaxLength(100)]
    public string? ShippingCarrier { get; set; }
    [MaxLength(100)]
    public string? TrackingNumber { get; set; }
}

internal sealed class ShipOrderHandler : ICommandHandler<ShipOrderCommand>
{
    private readonly IRepository<Order> _repository;
    private readonly IRepository<Listing> _listingRepository;
    private readonly IRepository<Notification> _notificationRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IUserClient _userClient;
    private readonly IPresenceClient _presenceClient;
    private readonly IEmailSender _emailSender;
    private readonly ILogger<ShipOrderHandler> _logger;

    public ShipOrderHandler(
        IRepository<Order> repository,
        IRepository<Listing> listingRepository,
        IRepository<Notification> notificationRepository,
        IUnitOfWork unitOfWork,
        IUserClient userClient,
        IPresenceClient presenceClient,
        IEmailSender emailSender,
        ILogger<ShipOrderHandler> logger)
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

    public async Task Handle(ShipOrderCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var order = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Order", request.Id);

        if (order.Status != "pending")
        {
            throw new BaseForge.Core.Exceptions.ValidationException("Status", "Sipariş zaten kargoya verilmiş veya teslim edilmiş.");
        }

        order.Status = "shipped";
        order.ShippingCarrier = request.ShippingCarrier;
        order.TrackingNumber = request.TrackingNumber;
        order.ShippedAt = DateTimeOffset.UtcNow;
        await _repository.UpdateAsync(order, cancellationToken);

        var listing = await _listingRepository.GetByIdAsync(order.ListingId, cancellationToken);
        var listingTitle = listing?.Title ?? "İlanınız";
        var title = "Siparişiniz kargoya verildi";
        var body = request.TrackingNumber is { Length: > 0 }
            ? $"\"{listingTitle}\" siparişiniz {request.ShippingCarrier ?? "kargo"} ile yola çıktı. Takip no: {request.TrackingNumber}."
            : $"\"{listingTitle}\" siparişiniz kargoya verildi.";
        var linkPath = $"/ilanlar/{order.ListingId}";

        await _notificationRepository.AddAsync(new Notification
        {
            RecipientUserId = order.BuyerId,
            Title = title,
            Body = body,
            LinkPath = linkPath,
        }, cancellationToken);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var deliveredLive = await _presenceClient.NotifyAsync(order.BuyerId, title, body, linkPath, cancellationToken);
        if (deliveredLive)
        {
            return;
        }

        try
        {
            var buyer = await _userClient.GetByIdAsync(order.BuyerId, cancellationToken);
            if (buyer is null || string.IsNullOrWhiteSpace(buyer.Email))
            {
                return;
            }

            var html = EmailTemplate.Build("KARGOYA VERİLDİ", title, body, "Siparişi Görüntüle", $"https://hekimburada.com{linkPath}");
            await _emailSender.SendAsync(buyer.Email, "HekimBurada — " + title, html, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Kargo e-postası gönderilemedi (BuyerId: {BuyerId}).", order.BuyerId);
        }
    }
}

/// <summary>Siparişin teslim edildiğini işaretler — hem alıcı hem satıcı çağırabilir (bkz.
/// OrdersController yetki kontrolü); "shipped" adımı atlanıp doğrudan buradan da geçilebilir
/// (ör. "elden" teslimde kargo yok). Karşı tarafa (çağıran kim değilse) bildirim gider.
/// CodeGen dışı, elle eklendi.</summary>
public sealed class DeliverOrderCommand : ICommand
{
    public Guid Id { get; set; }
    /// <summary>Bu işlemi tetikleyen kullanıcı — controller'da çağıranın kendi kimliğiyle doldurulur,
    /// bildirimin KARŞI tarafa gitmesi için gerekli.</summary>
    public Guid CallerId { get; set; }
}

internal sealed class DeliverOrderHandler : ICommandHandler<DeliverOrderCommand>
{
    private readonly IRepository<Order> _repository;
    private readonly IRepository<Listing> _listingRepository;
    private readonly IRepository<Notification> _notificationRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IUserClient _userClient;
    private readonly IPresenceClient _presenceClient;
    private readonly IEmailSender _emailSender;
    private readonly ILogger<DeliverOrderHandler> _logger;

    public DeliverOrderHandler(
        IRepository<Order> repository,
        IRepository<Listing> listingRepository,
        IRepository<Notification> notificationRepository,
        IUnitOfWork unitOfWork,
        IUserClient userClient,
        IPresenceClient presenceClient,
        IEmailSender emailSender,
        ILogger<DeliverOrderHandler> logger)
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

    public async Task Handle(DeliverOrderCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var order = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Order", request.Id);

        if (order.Status == "delivered")
        {
            throw new BaseForge.Core.Exceptions.ValidationException("Status", "Sipariş zaten teslim edildi olarak işaretli.");
        }

        order.Status = "delivered";
        order.DeliveredAt = DateTimeOffset.UtcNow;
        await _repository.UpdateAsync(order, cancellationToken);

        var recipientId = request.CallerId == order.BuyerId ? order.SellerId : order.BuyerId;
        var listing = await _listingRepository.GetByIdAsync(order.ListingId, cancellationToken);
        var listingTitle = listing?.Title ?? "İlan";
        var title = "Sipariş teslim edildi olarak işaretlendi";
        var body = $"\"{listingTitle}\" siparişi teslim edildi olarak işaretlendi.";
        var linkPath = $"/ilanlar/{order.ListingId}";

        await _notificationRepository.AddAsync(new Notification
        {
            RecipientUserId = recipientId,
            Title = title,
            Body = body,
            LinkPath = linkPath,
        }, cancellationToken);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var deliveredLive = await _presenceClient.NotifyAsync(recipientId, title, body, linkPath, cancellationToken);
        if (deliveredLive)
        {
            return;
        }

        try
        {
            var recipient = await _userClient.GetByIdAsync(recipientId, cancellationToken);
            if (recipient is null || string.IsNullOrWhiteSpace(recipient.Email))
            {
                return;
            }

            var html = EmailTemplate.Build("TESLİM EDİLDİ", title, body, "Siparişi Görüntüle", $"https://hekimburada.com{linkPath}");
            await _emailSender.SendAsync(recipient.Email, "HekimBurada — " + title, html, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Teslimat e-postası gönderilemedi (RecipientId: {RecipientId}).", recipientId);
        }
    }
}
