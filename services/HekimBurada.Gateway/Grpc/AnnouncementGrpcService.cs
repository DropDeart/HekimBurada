using System.Globalization;
using Grpc.Core;
using MediatR;
using Gateway.Features.Announcements;

namespace Gateway.Grpc;

/// <summary>
/// Announcement entity'sine diğer servislerin salt-okunur gRPC erişimi
/// (BaseForge.CodeGen tarafından üretildi; mevcut CQRS sorgusu üzerinden veri okur).
/// </summary>
public sealed class AnnouncementGrpcService(ISender sender) : AnnouncementService.AnnouncementServiceBase
{
    public override async Task<AnnouncementMessage> GetById(AnnouncementByIdRequest request, ServerCallContext context)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (!Guid.TryParse(request.Id, out var id))
        {
            throw new RpcException(new Status(StatusCode.InvalidArgument, "Geçersiz id."));
        }

        var value = await sender.Send(new GetAnnouncementByIdQuery { Id = id }, context.CancellationToken)
            ?? throw new RpcException(new Status(StatusCode.NotFound, $"Announcement bulunamadı: {id}"));

        return new AnnouncementMessage
        {
            Id = value.Id.ToString(),
            Title = value.Title,
            Body = value.Body,
            PublishedAt = value.PublishedAt.ToString("o", CultureInfo.InvariantCulture),
        };
    }
}
