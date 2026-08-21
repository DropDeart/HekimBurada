using BaseForge.Core.CQRS;
using BaseForge.Core.Exceptions;
using BaseForge.Core.Interfaces;
using Marketplace.Email;
using Marketplace.Entities;
using Marketplace.Integration;
using Microsoft.Extensions.Logging;

namespace Marketplace.Features.ListingReviews;

/// <summary>Bir ilana yeni bir yorum/değerlendirme ekler — CodeGen dışı, elle eklendi.</summary>
public sealed class CreateListingReviewCommand : ICommand<Guid>
{
    public Guid ListingId { get; set; }
    public Guid AuthorId { get; set; }
    public int Rating { get; set; }
    public string Body { get; set; } = string.Empty;
}

internal sealed class CreateListingReviewHandler : ICommandHandler<CreateListingReviewCommand, Guid>
{
    private readonly IRepository<ListingReview> _repository;
    private readonly IRepository<Listing> _listingRepository;
    private readonly IRepository<Notification> _notificationRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IUserClient _userClient;
    private readonly IEmailSender _emailSender;
    private readonly ILogger<CreateListingReviewHandler> _logger;

    public CreateListingReviewHandler(
        IRepository<ListingReview> repository,
        IRepository<Listing> listingRepository,
        IRepository<Notification> notificationRepository,
        IUnitOfWork unitOfWork,
        IUserClient userClient,
        IEmailSender emailSender,
        ILogger<CreateListingReviewHandler> logger)
    {
        _repository = repository;
        _listingRepository = listingRepository;
        _notificationRepository = notificationRepository;
        _unitOfWork = unitOfWork;
        _userClient = userClient;
        _emailSender = emailSender;
        _logger = logger;
    }

    public async Task<Guid> Handle(CreateListingReviewCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (request.Rating is < 1 or > 5)
        {
            throw new ValidationException("Rating", "Puan 1 ile 5 arasında olmalı.");
        }

        var entity = new ListingReview
        {
            ListingId = request.ListingId,
            AuthorId = request.AuthorId,
            Rating = request.Rating,
            Body = request.Body,
        };
        await _repository.AddAsync(entity, cancellationToken);

        // İlan sahibine bildirim + e-posta — kendi ilanına yorum yapması hariç. Bildirim/e-posta
        // gönderimi başarısız olsa da yorum kaydı geri alınmaz (best-effort, bkz. try/catch altta).
        // CodeGen dışı, elle eklendi.
        var listing = await _listingRepository.GetByIdAsync(request.ListingId, cancellationToken);
        if (listing is not null && listing.SellerId != request.AuthorId)
        {
            await _notificationRepository.AddAsync(new Notification
            {
                RecipientUserId = listing.SellerId,
                Title = "İlanınıza yeni bir yorum geldi",
                Body = $"\"{listing.Title}\" ilanınıza yeni bir yorum yazıldı.",
                LinkPath = $"/ilanlar/{listing.Id}",
            }, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (listing is not null && listing.SellerId != request.AuthorId)
        {
            await NotifyByEmailAsync(listing, request, cancellationToken);
        }

        return entity.Id;
    }

    private async Task NotifyByEmailAsync(Listing listing, CreateListingReviewCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var seller = await _userClient.GetByIdAsync(listing.SellerId, cancellationToken);
            if (seller is null || string.IsNullOrWhiteSpace(seller.Email))
            {
                return;
            }

            var reviewer = await _userClient.GetByIdAsync(request.AuthorId, cancellationToken);
            var reviewerName = reviewer?.FullName is { Length: > 0 } fullName ? fullName : "Bir meslektaşınız";
            var html = $"""
                <p>Merhaba,</p>
                <p><strong>{reviewerName}</strong>, <strong>"{listing.Title}"</strong> ilanınıza yeni bir yorum yazdı.</p>
                <p>Yorumu görmek için ilan sayfanızı ziyaret edin.</p>
                """;
            await _emailSender.SendAsync(seller.Email, "HekimBurada — İlanınıza yeni bir yorum geldi", html, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "İlan yorumu bildirim e-postası gönderilemedi (ListingId: {ListingId}).", listing.Id);
        }
    }
}

/// <summary>Bir yorumu siler — yazarı ya da admin/superadmin çağırabilir (kontrol controller'da).</summary>
public sealed class DeleteListingReviewCommand : ICommand
{
    public Guid Id { get; set; }
}

internal sealed class DeleteListingReviewHandler : ICommandHandler<DeleteListingReviewCommand>
{
    private readonly IRepository<ListingReview> _repository;
    private readonly IUnitOfWork _unitOfWork;
    public DeleteListingReviewHandler(IRepository<ListingReview> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(DeleteListingReviewCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("ListingReview", request.Id);
        await _repository.DeleteAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
