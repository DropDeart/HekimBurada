using BaseForge.API.Controllers;
using BaseForge.Core.CQRS;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Marketplace.Authorization;
using Marketplace.Features.Orders;

namespace Marketplace.Controllers;

/// <summary>
/// Sipariş uçları. CodeGen dışı, elle eklendi. Özel/finansal veri olduğundan yalnızca çağıranın kendi
/// siparişleri döner (Admin/SuperAdmin de dahil kimse başkasının siparişlerini listeleyemez — bu kapsamda
/// satıcı tarafı görünümü yok, bkz. OrderCommands.cs doc yorumu).
/// </summary>
[Authorize]
[Route("api/orders")]
public sealed class OrdersController : BaseController
{
    /// <summary>Çağıranın kendi siparişlerini (alıcı olarak) sayfalı listeler.</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<OrderDto>>> List([FromQuery] ListOrderQuery query, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(query);
        var callerId = AdminAuth.GetUserId(User);
        if (callerId is null)
        {
            return Forbid();
        }

        query.BuyerId = callerId.Value;
        return Ok(await Mediator.Send(query, cancellationToken));
    }

    /// <summary>Yeni bir sipariş oluşturur — BuyerId çağıranın kendi kimliğiyle ezilir.</summary>
    [HttpPost]
    public async Task<ActionResult<Guid>> Create(CreateOrderCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        var callerId = AdminAuth.GetUserId(User);
        if (callerId is null)
        {
            return Forbid();
        }

        command.BuyerId = callerId.Value;
        var id = await Mediator.Send(command, cancellationToken);
        return Ok(id);
    }
}
