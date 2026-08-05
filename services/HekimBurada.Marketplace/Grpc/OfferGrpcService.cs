using System.Globalization;
using Grpc.Core;
using MediatR;
using Marketplace.Features.Offers;

namespace Marketplace.Grpc;

/// <summary>
/// Offer entity'sine diğer servislerin salt-okunur gRPC erişimi
/// (BaseForge.CodeGen tarafından üretildi; mevcut CQRS sorgusu üzerinden veri okur).
/// </summary>
public sealed class OfferGrpcService(ISender sender) : OfferService.OfferServiceBase
{
    public override async Task<OfferMessage> GetById(OfferByIdRequest request, ServerCallContext context)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (!Guid.TryParse(request.Id, out var id))
        {
            throw new RpcException(new Status(StatusCode.InvalidArgument, "Geçersiz id."));
        }

        var value = await sender.Send(new GetOfferByIdQuery { Id = id }, context.CancellationToken)
            ?? throw new RpcException(new Status(StatusCode.NotFound, $"Offer bulunamadı: {id}"));

        return new OfferMessage
        {
            Id = value.Id.ToString(),
            Amount = value.Amount.ToString(CultureInfo.InvariantCulture),
            Status = value.Status,
        };
    }
}
