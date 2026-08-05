using System.Globalization;
using Grpc.Core;
using MediatR;
using Marketplace.Features.Listings;

namespace Marketplace.Grpc;

/// <summary>
/// Listing entity'sine diğer servislerin salt-okunur gRPC erişimi
/// (BaseForge.CodeGen tarafından üretildi; mevcut CQRS sorgusu üzerinden veri okur).
/// </summary>
public sealed class ListingGrpcService(ISender sender) : ListingService.ListingServiceBase
{
    public override async Task<ListingMessage> GetById(ListingByIdRequest request, ServerCallContext context)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (!Guid.TryParse(request.Id, out var id))
        {
            throw new RpcException(new Status(StatusCode.InvalidArgument, "Geçersiz id."));
        }

        var value = await sender.Send(new GetListingByIdQuery { Id = id }, context.CancellationToken)
            ?? throw new RpcException(new Status(StatusCode.NotFound, $"Listing bulunamadı: {id}"));

        return new ListingMessage
        {
            Id = value.Id.ToString(),
            Title = value.Title,
            Description = value.Description,
            Condition = value.Condition,
            Price = value.Price?.ToString(CultureInfo.InvariantCulture) ?? string.Empty,
            OriginalPrice = value.OriginalPrice?.ToString(CultureInfo.InvariantCulture) ?? string.Empty,
            PaymentMethod = value.PaymentMethod,
            ReferansUrl = value.ReferansUrl ?? string.Empty,
            City = value.City,
            Images = value.Images,
            Status = value.Status,
            DurationDays = value.DurationDays,
            PublishedAt = value.PublishedAt?.ToString("o", CultureInfo.InvariantCulture) ?? string.Empty,
            ExpiresAt = value.ExpiresAt?.ToString("o", CultureInfo.InvariantCulture) ?? string.Empty,
            RenewCount = value.RenewCount,
            IsFeatured = value.IsFeatured,
            ViewCount = value.ViewCount,
        };
    }
}
