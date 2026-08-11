using BaseForge.Core.CQRS;
using BaseForge.Core.Exceptions;
using BaseForge.Core.Interfaces;
using Marketplace.Entities;

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
    private readonly IUnitOfWork _unitOfWork;
    public CreateListingReviewHandler(IRepository<ListingReview> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
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
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return entity.Id;
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
