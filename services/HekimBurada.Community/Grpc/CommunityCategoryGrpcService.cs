using System.Globalization;
using Grpc.Core;
using MediatR;
using Community.Features.CommunityCategorys;

namespace Community.Grpc;

/// <summary>
/// CommunityCategory entity'sine diğer servislerin salt-okunur gRPC erişimi
/// (BaseForge.CodeGen tarafından üretildi; mevcut CQRS sorgusu üzerinden veri okur).
/// </summary>
public sealed class CommunityCategoryGrpcService(ISender sender) : CommunityCategoryService.CommunityCategoryServiceBase
{
    public override async Task<CommunityCategoryMessage> GetById(CommunityCategoryByIdRequest request, ServerCallContext context)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (!Guid.TryParse(request.Id, out var id))
        {
            throw new RpcException(new Status(StatusCode.InvalidArgument, "Geçersiz id."));
        }

        var value = await sender.Send(new GetCommunityCategoryByIdQuery { Id = id }, context.CancellationToken)
            ?? throw new RpcException(new Status(StatusCode.NotFound, $"CommunityCategory bulunamadı: {id}"));

        return new CommunityCategoryMessage
        {
            Id = value.Id.ToString(),
            Name = value.Name,
        };
    }
}
