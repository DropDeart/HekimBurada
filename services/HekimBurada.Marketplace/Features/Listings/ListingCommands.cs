using System.ComponentModel.DataAnnotations;
using BaseForge.Core.CQRS;
using BaseForge.Core.Exceptions;
using BaseForge.Core.Interfaces;
using Marketplace.Entities;
using Marketplace.Integration;

namespace Marketplace.Features.Listings;

/// <summary>Yeni bir Listing oluşturur; üretilen kimliği döndürür.</summary>
public sealed class CreateListingCommand : ICommand<Guid>
{
    /// <summary>Title.</summary>
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    /// <summary>Description.</summary>
    public string Description { get; set; } = string.Empty;
    /// <summary>Condition.</summary>
    [MaxLength(50)]
    public string Condition { get; set; } = string.Empty;
    /// <summary>Price.</summary>
    public decimal? Price { get; set; }
    /// <summary>OriginalPrice.</summary>
    public decimal? OriginalPrice { get; set; }
    /// <summary>PaymentMethod.</summary>
    [MaxLength(20)]
    public string PaymentMethod { get; set; } = string.Empty;
    /// <summary>ReferansUrl.</summary>
    [MaxLength(500)]
    public string? ReferansUrl { get; set; }
    /// <summary>City.</summary>
    [MaxLength(100)]
    public string City { get; set; } = string.Empty;
    /// <summary>Images.</summary>
    public string Images { get; set; } = string.Empty;
    /// <summary>Status.</summary>
    [MaxLength(20)]
    public string Status { get; set; } = "draft";
    /// <summary>DurationDays.</summary>
    public int DurationDays { get; set; }
    /// <summary>PublishedAt.</summary>
    public DateTimeOffset? PublishedAt { get; set; }
    /// <summary>ExpiresAt.</summary>
    public DateTimeOffset? ExpiresAt { get; set; }
    /// <summary>RenewCount.</summary>
    public int RenewCount { get; set; } = 0;
    /// <summary>IsFeatured.</summary>
    public bool IsFeatured { get; set; } = false;
    /// <summary>ViewCount.</summary>
    public int ViewCount { get; set; } = 0;
    /// <summary>CategoryId.</summary>
    public Guid CategoryId { get; set; }
    /// <summary>SellerId.</summary>
    public Guid SellerId { get; set; }
}

internal sealed class CreateListingHandler : ICommandHandler<CreateListingCommand, Guid>
{
    /// <summary>Kullanıcının seçebileceği tek ilan süresi seçenekleri (bkz. plan — YAML'da enum yok, kısıt burada).</summary>
    private static readonly int[] AllowedDurations = [15, 30, 60, 90];

    private readonly IRepository<Listing> _repository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IUserClient _userClient;
    public CreateListingHandler(IRepository<Listing> repository, IUnitOfWork unitOfWork, IUserClient userClient)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
        _userClient = userClient;
    }

    public async Task<Guid> Handle(CreateListingCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (Array.IndexOf(AllowedDurations, request.DurationDays) < 0)
        {
            throw new BaseForge.Core.Exceptions.ValidationException("DurationDays", "İlan süresi 15, 30, 60 veya 90 gün olmalı.");
        }

        await VerificationGate.EnsureApprovedAsync(_userClient, request.SellerId, cancellationToken);

        // Moderasyon yok — kayıt anında direkt yayına girer (bkz. plan "İlan moderasyonu" kararı).
        // Status/PublishedAt/ExpiresAt/RenewCount/ViewCount istemciden GELMEZ, sunucu hesaplar.
        var publishedAt = DateTimeOffset.UtcNow;
        var entity = new Listing
        {
            Title = request.Title,
            Description = request.Description,
            Condition = request.Condition,
            Price = request.Price,
            OriginalPrice = request.OriginalPrice,
            PaymentMethod = request.PaymentMethod,
            ReferansUrl = request.ReferansUrl,
            City = request.City,
            Images = request.Images,
            Status = "active",
            DurationDays = request.DurationDays,
            PublishedAt = publishedAt,
            ExpiresAt = publishedAt.AddDays(request.DurationDays),
            RenewCount = 0,
            IsFeatured = request.IsFeatured,
            ViewCount = 0,
            CategoryId = request.CategoryId,
            SellerId = request.SellerId,
        };
        await _repository.AddAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return entity.Id;
    }
}

/// <summary>Var olan bir Listing kaydını günceller.</summary>
public sealed class UpdateListingCommand : ICommand
{
    /// <summary>Güncellenecek kaydın kimliği.</summary>
    public Guid Id { get; set; }
    /// <summary>Title.</summary>
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    /// <summary>Description.</summary>
    public string Description { get; set; } = string.Empty;
    /// <summary>Condition.</summary>
    [MaxLength(50)]
    public string Condition { get; set; } = string.Empty;
    /// <summary>Price.</summary>
    public decimal? Price { get; set; }
    /// <summary>OriginalPrice.</summary>
    public decimal? OriginalPrice { get; set; }
    /// <summary>PaymentMethod.</summary>
    [MaxLength(20)]
    public string PaymentMethod { get; set; } = string.Empty;
    /// <summary>ReferansUrl.</summary>
    [MaxLength(500)]
    public string? ReferansUrl { get; set; }
    /// <summary>City.</summary>
    [MaxLength(100)]
    public string City { get; set; } = string.Empty;
    /// <summary>Images.</summary>
    public string Images { get; set; } = string.Empty;
    /// <summary>Status.</summary>
    [MaxLength(20)]
    public string Status { get; set; } = "draft";
    /// <summary>DurationDays.</summary>
    public int DurationDays { get; set; }
    /// <summary>PublishedAt.</summary>
    public DateTimeOffset? PublishedAt { get; set; }
    /// <summary>ExpiresAt.</summary>
    public DateTimeOffset? ExpiresAt { get; set; }
    /// <summary>RenewCount.</summary>
    public int RenewCount { get; set; } = 0;
    /// <summary>IsFeatured.</summary>
    public bool IsFeatured { get; set; } = false;
    /// <summary>ViewCount.</summary>
    public int ViewCount { get; set; } = 0;
    /// <summary>CategoryId.</summary>
    public Guid CategoryId { get; set; }
    /// <summary>SellerId.</summary>
    public Guid SellerId { get; set; }
}

internal sealed class UpdateListingHandler : ICommandHandler<UpdateListingCommand>
{
    private readonly IRepository<Listing> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public UpdateListingHandler(IRepository<Listing> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(UpdateListingCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Listing", request.Id);
        entity.Title = request.Title;
        entity.Description = request.Description;
        entity.Condition = request.Condition;
        entity.Price = request.Price;
        entity.OriginalPrice = request.OriginalPrice;
        entity.PaymentMethod = request.PaymentMethod;
        entity.ReferansUrl = request.ReferansUrl;
        entity.City = request.City;
        entity.Images = request.Images;
        entity.Status = request.Status;
        entity.DurationDays = request.DurationDays;
        entity.PublishedAt = request.PublishedAt;
        entity.ExpiresAt = request.ExpiresAt;
        entity.RenewCount = request.RenewCount;
        entity.IsFeatured = request.IsFeatured;
        entity.ViewCount = request.ViewCount;
        entity.CategoryId = request.CategoryId;
        entity.SellerId = request.SellerId;
        await _repository.UpdateAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>Bir Listing kaydını siler (soft delete).</summary>
public sealed class DeleteListingCommand : ICommand
{
    /// <summary>Silinecek kaydın kimliği.</summary>
    public Guid Id { get; set; }
}

internal sealed class DeleteListingHandler : ICommandHandler<DeleteListingCommand>
{
    private readonly IRepository<Listing> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public DeleteListingHandler(IRepository<Listing> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(DeleteListingCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Listing", request.Id);
        await _repository.DeleteAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>Listing'ın ViewCount sayacını bir artırır.</summary>
public sealed class IncrementListingViewCountCommand : ICommand
{
    /// <summary>Kaydın kimliği.</summary>
    public Guid Id { get; set; }
}

internal sealed class IncrementListingViewCountHandler : ICommandHandler<IncrementListingViewCountCommand>
{
    private readonly IRepository<Listing> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public IncrementListingViewCountHandler(IRepository<Listing> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(IncrementListingViewCountCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Listing", request.Id);
        entity.ViewCount++;
        await _repository.UpdateAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}

// ---- CodeGen'in üretmediği, HekimBurada'ya özgü ilan yaşam döngüsü komutları (bkz. plan) ----

/// <summary>
/// Bir Listing'i (süresi dolmuş olsun ya da olmasın) yeniden yayınlar: ExpiresAt bugünden itibaren
/// yeniden hesaplanır, RenewCount artar. "Aynı ilanı tekrar oluşturma" ihtiyacını ortadan kaldırır —
/// teklif/görüntülenme geçmişi korunur. Yalnızca 'active' veya 'expired' durumundaki ilanlarda geçerli.
/// </summary>
public sealed class RenewListingCommand : ICommand
{
    /// <summary>Yenilenecek ilanın kimliği.</summary>
    public Guid Id { get; set; }
}

internal sealed class RenewListingHandler : ICommandHandler<RenewListingCommand>
{
    private readonly IRepository<Listing> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public RenewListingHandler(IRepository<Listing> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(RenewListingCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Listing", request.Id);

        if (entity.Status is not ("active" or "expired"))
        {
            throw new BaseForge.Core.Exceptions.ValidationException("Status", "Yalnızca 'active' veya 'expired' durumundaki ilanlar yenilenebilir.");
        }

        var publishedAt = DateTimeOffset.UtcNow;
        entity.Status = "active";
        entity.PublishedAt = publishedAt;
        entity.ExpiresAt = publishedAt.AddDays(entity.DurationDays);
        entity.RenewCount++;
        await _repository.UpdateAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>
/// Sahibi tarafından "Sat"/"Kaldır" ile kapatılmış ('sold'/'removed') bir ilanı yeniden yayına alır —
/// formu yeniden doldurmadan, mevcut kaydı ('active') canlandırır (bkz. plan "Faz B — Bilinen el işi").
/// </summary>
public sealed class RepublishListingCommand : ICommand
{
    /// <summary>Yeniden yayınlanacak ilanın kimliği.</summary>
    public Guid Id { get; set; }
}

internal sealed class RepublishListingHandler : ICommandHandler<RepublishListingCommand>
{
    private readonly IRepository<Listing> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public RepublishListingHandler(IRepository<Listing> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(RepublishListingCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Listing", request.Id);

        if (entity.Status is not ("sold" or "removed"))
        {
            throw new BaseForge.Core.Exceptions.ValidationException("Status", "Yalnızca 'sold' veya 'removed' durumundaki ilanlar yeniden yayınlanabilir.");
        }

        var publishedAt = DateTimeOffset.UtcNow;
        entity.Status = "active";
        entity.PublishedAt = publishedAt;
        entity.ExpiresAt = publishedAt.AddDays(entity.DurationDays);
        await _repository.UpdateAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
