using BaseForge.API.Controllers;
using BaseForge.Core.CQRS;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Gateway.Authorization;
using Gateway.Features.Announcements;

namespace Gateway.Controllers;

/// <summary>Announcement CRUD uçları. Duyuru panosu/navbar herkese açık (login öncesi de görünür) —
/// okuma anonim, yönetim (Create/Update/Delete) yalnızca Admin/SuperAdmin'e açık. Rol şartı CodeGen
/// dışı, elle eklendi.</summary>
[Authorize]
[Route("api/[controller]")]
public sealed class AnnouncementsController : BaseController
{
    /// <summary>Kimliğe göre tek bir Announcement getirir.</summary>
    [AllowAnonymous]
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AnnouncementDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetAnnouncementByIdQuery { Id = id }, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    /// <summary>Announcement kayıtlarını sayfalı listeler (query string: page, pageSize, sortBy, search).</summary>
    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<PagedResult<AnnouncementDto>>> List([FromQuery] ListAnnouncementQuery query, CancellationToken cancellationToken)
        => Ok(await Mediator.Send(query, cancellationToken));

    /// <summary>Yeni bir Announcement oluşturur — CodeGen dışı: Admin/SuperAdmin şartı ve AuthorId'nin
    /// çağıranın kendi kimliğiyle ezilmesi elle eklendi.</summary>
    [HttpPost]
    public async Task<ActionResult<Guid>> Create(CreateAnnouncementCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        if (!AdminAuth.IsStaffAdmin(User))
        {
            return Forbid();
        }

        var callerId = AdminAuth.GetUserId(User);
        if (callerId is null)
        {
            return Forbid();
        }

        command.AuthorId = callerId.Value;
        var id = await Mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id }, id);
    }

    /// <summary>Var olan bir Announcement kaydını günceller — CodeGen dışı: Admin/SuperAdmin şartı elle eklendi.</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateAnnouncementCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        if (!AdminAuth.IsStaffAdmin(User))
        {
            return Forbid();
        }

        command.Id = id;
        await Mediator.Send(command, cancellationToken);
        return NoContent();
    }

    /// <summary>Bir Announcement kaydını siler — CodeGen dışı: Admin/SuperAdmin şartı elle eklendi.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (!AdminAuth.IsStaffAdmin(User))
        {
            return Forbid();
        }

        await Mediator.Send(new DeleteAnnouncementCommand { Id = id }, cancellationToken);
        return NoContent();
    }
}
