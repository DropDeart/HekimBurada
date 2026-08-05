using System.Globalization;
using Grpc.Core;
using MediatR;
using Marketplace.Features.Favorites;

namespace Marketplace.Grpc;

/// <summary>
/// Favorite entity'sine diğer servislerin salt-okunur gRPC erişimi
/// (BaseForge.CodeGen tarafından üretildi; mevcut CQRS sorgusu üzerinden veri okur).
/// </summary>
public sealed class FavoriteGrpcService(ISender sender) : FavoriteService.FavoriteServiceBase
{
    public override async Task<FavoriteMessage> GetById(FavoriteByIdRequest request, ServerCallContext context)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (!Guid.TryParse(request.Id, out var id))
        {
            throw new RpcException(new Status(StatusCode.InvalidArgument, "Geçersiz id."));
        }

        var value = await sender.Send(new GetFavoriteByIdQuery { Id = id }, context.CancellationToken)
            ?? throw new RpcException(new Status(StatusCode.NotFound, $"Favorite bulunamadı: {id}"));

        return new FavoriteMessage
        {
            Id = value.Id.ToString(),
        };
    }
}
