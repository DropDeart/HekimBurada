using BaseForge.API.Controllers;
using BaseForge.Core.CQRS;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Community.Features.Topics;

namespace Community.Controllers;

/// <summary>Topic CRUD uçları.</summary>
[Authorize]
[Route("api/[controller]")]
public sealed class TopicsController : BaseController
{
    /// <summary>Kimliğe göre tek bir Topic getirir.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TopicDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetTopicByIdQuery { Id = id }, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    /// <summary>Topic kayıtlarını sayfalı listeler (query string: page, pageSize, sortBy, search).</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<TopicDto>>> List([FromQuery] ListTopicQuery query, CancellationToken cancellationToken)
        => Ok(await Mediator.Send(query, cancellationToken));

    /// <summary>Yeni bir Topic oluşturur.</summary>
    [HttpPost]
    public async Task<ActionResult<Guid>> Create(CreateTopicCommand command, CancellationToken cancellationToken)
    {
        var id = await Mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id }, id);
    }

    /// <summary>Var olan bir Topic kaydını günceller.</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateTopicCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        command.Id = id;
        await Mediator.Send(command, cancellationToken);
        return NoContent();
    }

    /// <summary>Bir Topic kaydını siler.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await Mediator.Send(new DeleteTopicCommand { Id = id }, cancellationToken);
        return NoContent();
    }

    /// <summary>ViewCount sayacını bir artırır (herkese açık).</summary>
    [AllowAnonymous]
    [HttpPost("{id:guid}/increment-viewcount")]
    public async Task<IActionResult> IncrementViewCount(Guid id, CancellationToken cancellationToken)
    {
        await Mediator.Send(new IncrementTopicViewCountCommand { Id = id }, cancellationToken);
        return NoContent();
    }
}
