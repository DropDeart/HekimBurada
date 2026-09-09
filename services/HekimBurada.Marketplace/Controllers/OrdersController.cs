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
    public async Task<ActionResult<OrderDto>> Ship(Guid id, ShipOrderCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        var (_, _, error) = await LoadAuthorizedOrderAsync(id, allowBuyer: false, cancellationToken);
        if (error is not null)
        {
            return error;
        }

        command.Id = id;
        return Ok(await Mediator.Send(command, cancellationToken));
    }

    /// <summary>Siparişin teslim edildiğini işaretler — hem alıcı hem satıcı çağırabilir.
    /// CodeGen dışı, elle eklendi.</summary>
    [HttpPost("{id:guid}/deliver")]
    public async Task<ActionResult<OrderDto>> Deliver(Guid id, CancellationToken cancellationToken)
    {
        var (_, callerId, error) = await LoadAuthorizedOrderAsync(id, allowBuyer: true, cancellationToken);
        if (error is not null)
        {
            return error;
        }

        return Ok(await Mediator.Send(new DeliverOrderCommand { Id = id, CallerId = callerId }, cancellationToken));
    }

    /// <summary>Ship/Deliver'ın ortak "siparişi çek + çağıran gerçekten bu siparişin tarafı mı (veya
    /// admin mi)" kontrolü — <paramref name="allowBuyer"/> false ise yalnızca satıcı (Ship: alıcının
    /// kargo durumunu değiştirmesi anlamsız), true ise alıcı veya satıcı (Deliver) yetkili sayılır.
    /// CodeGen dışı, elle eklendi (bkz. /simplify incelemesi — iki uçta satır içi tekrarlanıyordu).</summary>
    private async Task<(OrderDto? Order, Guid CallerId, ActionResult? Error)> LoadAuthorizedOrderAsync(
        Guid id, bool allowBuyer, CancellationToken cancellationToken)
    {
        var callerId = AdminAuth.GetUserId(User);
        if (callerId is null)
        {
            return (null, Guid.Empty, Forbid());
        }

        var order = await Mediator.Send(new GetOrderByIdQuery { Id = id }, cancellationToken);
        if (order is null)
        {
            return (null, callerId.Value, NotFound());
        }

        var isAuthorizedParty = order.SellerId == callerId.Value || (allowBuyer && order.BuyerId == callerId.Value);
        if (!isAuthorizedParty && !AdminAuth.IsStaffAdmin(User))
        {
            return (null, callerId.Value, Forbid());
        }

        return (order, callerId.Value, null);
    }
}
