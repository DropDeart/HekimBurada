using BaseForge.API.Controllers;
using BaseForge.Core.CQRS;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Marketplace.Authorization;
using Marketplace.Features.Orders;

namespace Marketplace.Controllers;

/// <summary>
/// Sipariş uçları. CodeGen dışı, elle eklendi. Özel/finansal veri olduğundan çağıran yalnızca kendi
/// aldığı (buyer) veya kendi ilanlarına gelen (seller) siparişleri görebilir — başka hiç kimsenin
/// siparişi (Admin/SuperAdmin dahil) bu uçlardan listelenemez.
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

    /// <summary>Çağıranın kendi ilanlarına gelen siparişleri (satıcı olarak) sayfalı listeler —
    /// dekont/bağış kuruluşu gibi alanları görüp siparişi onaylayabilmesi için (bkz. proje kararı).</summary>
    [HttpGet("received")]
    public async Task<ActionResult<PagedResult<OrderDto>>> Received([FromQuery] ListOrdersForSellerQuery query, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(query);
        var callerId = AdminAuth.GetUserId(User);
        if (callerId is null)
        {
            return Forbid();
        }

        query.SellerId = callerId.Value;
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

    /// <summary>Siparişi kargoya verildi olarak işaretler — yalnızca ilgili ilanın satıcısı.
    /// CodeGen dışı, elle eklendi.</summary>
    [HttpPost("{id:guid}/ship")]
    public async Task<IActionResult> Ship(Guid id, ShipOrderCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        var callerId = AdminAuth.GetUserId(User);
        if (callerId is null)
        {
            return Forbid();
        }

        var order = await Mediator.Send(new GetOrderByIdQuery { Id = id }, cancellationToken);
        if (order is null)
        {
            return NotFound();
        }

        if (order.SellerId != callerId.Value && !AdminAuth.IsStaffAdmin(User))
        {
            return Forbid();
        }

        command.Id = id;
        await Mediator.Send(command, cancellationToken);
        return NoContent();
    }

    /// <summary>Siparişin teslim edildiğini işaretler — hem alıcı hem satıcı çağırabilir.
    /// CodeGen dışı, elle eklendi.</summary>
    [HttpPost("{id:guid}/deliver")]
    public async Task<IActionResult> Deliver(Guid id, CancellationToken cancellationToken)
    {
        var callerId = AdminAuth.GetUserId(User);
        if (callerId is null)
        {
            return Forbid();
        }

        var order = await Mediator.Send(new GetOrderByIdQuery { Id = id }, cancellationToken);
        if (order is null)
        {
            return NotFound();
        }

        if (order.BuyerId != callerId.Value && order.SellerId != callerId.Value && !AdminAuth.IsStaffAdmin(User))
        {
            return Forbid();
        }

        await Mediator.Send(new DeliverOrderCommand { Id = id, CallerId = callerId.Value }, cancellationToken);
        return NoContent();
    }
}
