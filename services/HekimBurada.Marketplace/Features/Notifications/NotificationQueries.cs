using BaseForge.Core.CQRS;
using BaseForge.Core.Interfaces;
using Marketplace.Entities;

namespace Marketplace.Features.Notifications;

/// <summary>Çağıranın kendi bildirimlerini en yeniden eskiye listeler — CodeGen dışı, elle eklendi.</summary>
public sealed class ListMyNotificationsQuery : IQuery<List<NotificationDto>>
{
    public Guid RecipientUserId { get; set; }
}

internal sealed class ListMyNotificationsHandler : IQueryHandler<ListMyNotificationsQuery, List<NotificationDto>>
{
    private readonly IRepository<Notification> _repository;

    public ListMyNotificationsHandler(IRepository<Notification> repository) => _repository = repository;

    public async Task<List<NotificationDto>> Handle(ListMyNotificationsQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var (items, _) = await _repository.ListPagedAsync(
            0,
            50,
            null,
            query => query.Where(x => x.RecipientUserId == request.RecipientUserId),
            cancellationToken);

        return items.OrderByDescending(x => x.CreatedAt).Select(NotificationDto.From).ToList();
    }
}
