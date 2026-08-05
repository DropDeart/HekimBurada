using System.Globalization;
using Grpc.Core;
using MediatR;
using Community.Features.Topics;

namespace Community.Grpc;

/// <summary>
/// Topic entity'sine diğer servislerin salt-okunur gRPC erişimi
/// (BaseForge.CodeGen tarafından üretildi; mevcut CQRS sorgusu üzerinden veri okur).
/// </summary>
public sealed class TopicGrpcService(ISender sender) : TopicService.TopicServiceBase
{
    public override async Task<TopicMessage> GetById(TopicByIdRequest request, ServerCallContext context)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (!Guid.TryParse(request.Id, out var id))
        {
            throw new RpcException(new Status(StatusCode.InvalidArgument, "Geçersiz id."));
        }

        var value = await sender.Send(new GetTopicByIdQuery { Id = id }, context.CancellationToken)
            ?? throw new RpcException(new Status(StatusCode.NotFound, $"Topic bulunamadı: {id}"));

        return new TopicMessage
        {
            Id = value.Id.ToString(),
            Title = value.Title,
            Body = value.Body,
            ViewCount = value.ViewCount,
            IsPinned = value.IsPinned,
            IsLocked = value.IsLocked,
        };
    }
}
