using BaseForge.API.Controllers;
using BaseForge.Core.CQRS;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Gateway.Features.Announcements;

namespace Gateway.Controllers;

/// <summary>Announcement CRUD uçları.</summary>
[Authorize]
[Route("api/[controller]")]
public sealed class AnnouncementsController : BaseController
{
    /// <summary>Kimliğe göre tek bir Announcement getirir.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AnnouncementDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetAnnouncementByIdQuery { Id = id }, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    /// <summary>Announcement kayıtlarını sayfalı listeler (query string: page, pageSize, sortBy, search).</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<AnnouncementDto>>> List([FromQuery] ListAnnouncementQuery query, CancellationToken cancellationToken)
        => Ok(await Mediator.Send(query, cancellationToken));

    /// <summary>Yeni bir Announcement oluşturur.</summary>
    [HttpPost]
    public async Task<ActionResult<Guid>> Create(CreateAnnouncementCommand command, CancellationToken cancellationToken)
    {
        var id = await Mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id }, id);
    }

    /// <summary>Var olan bir Announcement kaydını günceller.</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateAnnouncementCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        command.Id = id;
        await Mediator.Send(command, cancellationToken);
        return NoContent();
    }

    /// <summary>Bir Announcement kaydını siler.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await Mediator.Send(new DeleteAnnouncementCommand { Id = id }, cancellationToken);
        return NoContent();
    }
}
