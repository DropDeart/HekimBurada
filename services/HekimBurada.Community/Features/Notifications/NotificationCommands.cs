using BaseForge.Core.CQRS;
using BaseForge.Core.Interfaces;
using Community.Entities;

namespace Community.Features.Notifications;

/// <summary>Çağıranın tüm bildirimlerini okunmuş işaretler — CodeGen dışı, elle eklendi.</summary>
public sealed class MarkAllNotificationsReadCommand : ICommand
{
    public Guid RecipientUserId { get; set; }
}

internal sealed class MarkAllNotificationsReadHandler : ICommandHandler<MarkAllNotificationsReadCommand>
{
    private readonly IRepository<Notification> _repository;
    private readonly IUnitOfWork _unitOfWork;

    public MarkAllNotificationsReadHandler(IRepository<Notification> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(MarkAllNotificationsReadCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var (items, _) = await _repository.ListPagedAsync(
            0,
            200,
            null,
            query => query.Where(x => x.RecipientUserId == request.RecipientUserId && !x.IsRead),
            cancellationToken);

        foreach (var item in items)
        {
            item.IsRead = true;
            await _repository.UpdateAsync(item, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
