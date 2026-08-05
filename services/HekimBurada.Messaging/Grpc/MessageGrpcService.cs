using System.Globalization;
using Grpc.Core;
using MediatR;
using Messaging.Features.Messages;

namespace Messaging.Grpc;

/// <summary>
/// Message entity'sine diğer servislerin salt-okunur gRPC erişimi
/// (BaseForge.CodeGen tarafından üretildi; mevcut CQRS sorgusu üzerinden veri okur).
/// </summary>
public sealed class MessageGrpcService(ISender sender) : MessageService.MessageServiceBase
{
    public override async Task<MessageMessage> GetById(MessageByIdRequest request, ServerCallContext context)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (!Guid.TryParse(request.Id, out var id))
        {
            throw new RpcException(new Status(StatusCode.InvalidArgument, "Geçersiz id."));
        }

        var value = await sender.Send(new GetMessageByIdQuery { Id = id }, context.CancellationToken)
            ?? throw new RpcException(new Status(StatusCode.NotFound, $"Message bulunamadı: {id}"));

        return new MessageMessage
        {
            Id = value.Id.ToString(),
            Body = value.Body,
        };
    }
}
