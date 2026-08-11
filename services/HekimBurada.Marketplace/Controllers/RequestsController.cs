using BaseForge.API.Controllers;
using BaseForge.Core.CQRS;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Marketplace.Authorization;
using Marketplace.Features.Requests;

namespace Marketplace.Controllers;

/// <summary>Request CRUD uçları.</summary>
[Authorize]
[Route("api/[controller]")]
public sealed class RequestsController : BaseController
{
    /// <summary>Kimliğe göre tek bir Request getirir.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<RequestDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetRequestByIdQuery { Id = id }, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    /// <summary>Request kayıtlarını sayfalı listeler (query string: page, pageSize, sortBy, search).</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<RequestDto>>> List([FromQuery] ListRequestQuery query, CancellationToken cancellationToken)
        => Ok(await Mediator.Send(query, cancellationToken));

    /// <summary>Yeni bir Request oluşturur — CodeGen dışı: RequesterId sahtekarlığını önlemek için
    /// çağıranın kendi kimliğiyle elle ezildi (client-supplied değerine güvenilmiyor).</summary>
    [HttpPost]
    public async Task<ActionResult<Guid>> Create(CreateRequestCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        var callerId = AdminAuth.GetUserId(User);
        if (callerId is null)
        {
            return Forbid();
        }

        command.RequesterId = callerId.Value;
        var id = await Mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id }, id);
    }

    /// <summary>Var olan bir Request kaydını günceller — CodeGen dışı: sahip/admin şartı elle eklendi.
    /// Update komutu tüm alanları eziyor; admin olmayan çağıran RequesterId'yi başkasına devredemesin diye
    /// alan orijinal değerine sabitleniyor.</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateRequestCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        var isAdmin = AdminAuth.IsStaffAdmin(User);
        if (!isAdmin)
        {
            var request = await Mediator.Send(new GetRequestByIdQuery { Id = id }, cancellationToken);
            if (request is not null)
            {
                var callerId = AdminAuth.GetUserId(User);
                if (callerId is null || request.RequesterId != callerId)
                {
                    return Forbid();
                }

                command.RequesterId = request.RequesterId;
            }
        }

        command.Id = id;
        await Mediator.Send(command, cancellationToken);
        return NoContent();
    }

    /// <summary>Bir Request kaydını siler — CodeGen dışı: sahip/admin şartı elle eklendi.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (await IsOwnerOrAdminAsync(id, cancellationToken) == false)
        {
            return Forbid();
        }

        await Mediator.Send(new DeleteRequestCommand { Id = id }, cancellationToken);
        return NoContent();
    }

    /// <summary>Çağıran, talebin sahibi mi (RequesterId) yoksa Admin/SuperAdmin mi? — CodeGen dışı, elle
    /// eklendi. Talep yoksa null döner (asıl komut kendi NotFoundException'ını fırlatsın).</summary>
    private async Task<bool?> IsOwnerOrAdminAsync(Guid requestId, CancellationToken cancellationToken)
    {
        if (AdminAuth.IsStaffAdmin(User))
        {
            return true;
        }

        var request = await Mediator.Send(new GetRequestByIdQuery { Id = requestId }, cancellationToken);
        if (request is null)
        {
            return null;
        }

        var callerId = AdminAuth.GetUserId(User);
        return callerId is not null && request.RequesterId == callerId;
    }
}
