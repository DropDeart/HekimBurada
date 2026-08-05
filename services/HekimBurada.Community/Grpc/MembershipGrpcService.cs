using System.Globalization;
using Grpc.Core;
using MediatR;
using Community.Features.Memberships;

namespace Community.Grpc;

/// <summary>
/// Membership entity'sine diğer servislerin salt-okunur gRPC erişimi
/// (BaseForge.CodeGen tarafından üretildi; mevcut CQRS sorgusu üzerinden veri okur).
/// </summary>
public sealed class MembershipGrpcService(ISender sender) : MembershipService.MembershipServiceBase
{
    public override async Task<MembershipMessage> GetById(MembershipByIdRequest request, ServerCallContext context)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (!Guid.TryParse(request.Id, out var id))
        {
            throw new RpcException(new Status(StatusCode.InvalidArgument, "Geçersiz id."));
        }

        var value = await sender.Send(new GetMembershipByIdQuery { Id = id }, context.CancellationToken)
            ?? throw new RpcException(new Status(StatusCode.NotFound, $"Membership bulunamadı: {id}"));

        return new MembershipMessage
        {
            Id = value.Id.ToString(),
            AutoJoined = value.AutoJoined,
        };
    }
}
