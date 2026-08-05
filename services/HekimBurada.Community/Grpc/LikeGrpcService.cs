using System.Globalization;
using Grpc.Core;
using MediatR;
using Community.Features.Likes;

namespace Community.Grpc;

/// <summary>
/// Like entity'sine diğer servislerin salt-okunur gRPC erişimi
/// (BaseForge.CodeGen tarafından üretildi; mevcut CQRS sorgusu üzerinden veri okur).
/// </summary>
public sealed class LikeGrpcService(ISender sender) : LikeService.LikeServiceBase
{
    public override async Task<LikeMessage> GetById(LikeByIdRequest request, ServerCallContext context)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (!Guid.TryParse(request.Id, out var id))
        {
            throw new RpcException(new Status(StatusCode.InvalidArgument, "Geçersiz id."));
        }

        var value = await sender.Send(new GetLikeByIdQuery { Id = id }, context.CancellationToken)
            ?? throw new RpcException(new Status(StatusCode.NotFound, $"Like bulunamadı: {id}"));

        return new LikeMessage
        {
            Id = value.Id.ToString(),
        };
    }
}
