using System.Globalization;
using Grpc.Core;
using MediatR;
using Marketplace.Features.Requests;

namespace Marketplace.Grpc;

/// <summary>
/// Request entity'sine diğer servislerin salt-okunur gRPC erişimi
/// (BaseForge.CodeGen tarafından üretildi; mevcut CQRS sorgusu üzerinden veri okur).
/// </summary>
public sealed class RequestGrpcService(ISender sender) : RequestService.RequestServiceBase
{
    public override async Task<RequestMessage> GetById(RequestByIdRequest request, ServerCallContext context)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (!Guid.TryParse(request.Id, out var id))
        {
            throw new RpcException(new Status(StatusCode.InvalidArgument, "Geçersiz id."));
        }

        var value = await sender.Send(new GetRequestByIdQuery { Id = id }, context.CancellationToken)
            ?? throw new RpcException(new Status(StatusCode.NotFound, $"Request bulunamadı: {id}"));

        return new RequestMessage
        {
            Id = value.Id.ToString(),
            Title = value.Title,
            Description = value.Description,
            BudgetMax = value.BudgetMax?.ToString(CultureInfo.InvariantCulture) ?? string.Empty,
            Status = value.Status,
        };
    }
}
