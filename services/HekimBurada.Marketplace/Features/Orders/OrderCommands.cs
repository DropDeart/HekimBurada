using System.ComponentModel.DataAnnotations;
using BaseForge.Core.CQRS;
using BaseForge.Core.Exceptions;
using BaseForge.Core.Interfaces;
using Marketplace.Entities;

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
