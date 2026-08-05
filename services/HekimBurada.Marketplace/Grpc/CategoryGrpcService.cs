using System.Globalization;
using Grpc.Core;
using MediatR;
using Marketplace.Features.Categorys;

namespace Marketplace.Grpc;

/// <summary>
/// Category entity'sine diğer servislerin salt-okunur gRPC erişimi
/// (BaseForge.CodeGen tarafından üretildi; mevcut CQRS sorgusu üzerinden veri okur).
/// </summary>
public sealed class CategoryGrpcService(ISender sender) : CategoryService.CategoryServiceBase
{
    public override async Task<CategoryMessage> GetById(CategoryByIdRequest request, ServerCallContext context)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (!Guid.TryParse(request.Id, out var id))
        {
            throw new RpcException(new Status(StatusCode.InvalidArgument, "Geçersiz id."));
        }

        var value = await sender.Send(new GetCategoryByIdQuery { Id = id }, context.CancellationToken)
            ?? throw new RpcException(new Status(StatusCode.NotFound, $"Category bulunamadı: {id}"));

        return new CategoryMessage
        {
            Id = value.Id.ToString(),
            Name = value.Name,
        };
    }
}
