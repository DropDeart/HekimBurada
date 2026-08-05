using System.Globalization;
using Grpc.Core;
using MediatR;
using Community.Features.Comments;

namespace Community.Grpc;

/// <summary>
/// Comment entity'sine diğer servislerin salt-okunur gRPC erişimi
/// (BaseForge.CodeGen tarafından üretildi; mevcut CQRS sorgusu üzerinden veri okur).
/// </summary>
public sealed class CommentGrpcService(ISender sender) : CommentService.CommentServiceBase
{
    public override async Task<CommentMessage> GetById(CommentByIdRequest request, ServerCallContext context)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (!Guid.TryParse(request.Id, out var id))
        {
            throw new RpcException(new Status(StatusCode.InvalidArgument, "Geçersiz id."));
        }

        var value = await sender.Send(new GetCommentByIdQuery { Id = id }, context.CancellationToken)
            ?? throw new RpcException(new Status(StatusCode.NotFound, $"Comment bulunamadı: {id}"));

        return new CommentMessage
        {
            Id = value.Id.ToString(),
            Body = value.Body,
        };
    }
}
