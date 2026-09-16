using BaseForge.API.Controllers;
using BaseForge.Core.CQRS;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Community.Authorization;
using Community.Data;
using Community.Features.Comments;

namespace Community.Controllers;

/// <summary>Comment CRUD uçları. Okuma (GetById/List) herkese açık — ancak yorumun bağlı olduğu konunun
/// CommunityCategory'si kapalıysa (IsClosed) anonim çağırana içerik gösterilmez (bkz.
/// TopicsController'daki aynı desen). Yazma her zaman giriş gerektirir. CodeGen dışı elle eklendi.</summary>
[Route("api/[controller]")]
public sealed class CommentsController : BaseController
{
    /// <summary>Kimliğe göre tek bir Comment getirir — kapalı topluluğun yorumu anonime 401 döner.</summary>
    [AllowAnonymous]
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CommentDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetCommentByIdQuery { Id = id }, cancellationToken);
        if (result is null)
        {
            return NotFound();
        }

        if (!(User.Identity?.IsAuthenticated ?? false) && await IsTopicCategoryClosedAsync(result.TopicId, cancellationToken))
        {
            return Unauthorized();
        }

        return Ok(result);
    }

    /// <summary>Comment kayıtlarını sayfalı listeler (query string: page, pageSize, sortBy, search) —
    /// anonim çağırana kapalı topluluklara ait konuların yorumları filtrelenir.</summary>
    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<PagedResult<CommentDto>>> List([FromQuery] ListCommentQuery query, CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(query, cancellationToken);
        if (User.Identity?.IsAuthenticated ?? false)
        {
            return Ok(result);
        }

        var topicIds = result.Items.Select(c => c.TopicId).Distinct().ToList();
        var db = HttpContext.RequestServices.GetRequiredService<CommunityDbContext>();
        var closedTopicIds = await db.Topics
            .Where(t => topicIds.Contains(t.Id) && t.Category!.IsClosed)
            .Select(t => t.Id)
            .ToListAsync(cancellationToken);
        var closedSet = closedTopicIds.ToHashSet();

        return Ok(new PagedResult<CommentDto>
        {
            Items = result.Items.Where(c => !closedSet.Contains(c.TopicId)).ToList(),
            TotalCount = result.TotalCount,
            Page = result.Page,
            PageSize = result.PageSize,
        });
    }

    /// <summary>Yorumun bağlı olduğu konunun kategorisi kapalı mı? — CodeGen dışı, elle eklendi.</summary>
    private async Task<bool> IsTopicCategoryClosedAsync(Guid topicId, CancellationToken cancellationToken)
    {
        var db = HttpContext.RequestServices.GetRequiredService<CommunityDbContext>();
        return await db.Topics
            .Where(t => t.Id == topicId)
            .Select(t => t.Category!.IsClosed)
            .FirstOrDefaultAsync(cancellationToken);
    }

    /// <summary>Yeni bir Comment oluşturur — CodeGen dışı: AuthorId sahtekarlığını önlemek için
    /// çağıranın kendi kimliğiyle elle ezildi (client-supplied değerine güvenilmiyor). ParentId
    /// verilmişse bu bir yanıttır (tek seviye iç içelik).</summary>
    [Authorize]
    [HttpPost]
    public async Task<ActionResult<Guid>> Create(CreateCommentCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        var callerId = AdminAuth.GetUserId(User);
        if (callerId is null)
        {
            return Forbid();
        }

        command.AuthorId = callerId.Value;
        var id = await Mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id }, id);
    }

    /// <summary>Var olan bir Comment kaydını günceller — CodeGen dışı: sahip/admin şartı elle eklendi.
    /// Update komutu tüm alanları eziyor; admin olmayan çağıran AuthorId'yi başkasına devredemesin diye
    /// alan orijinal değerine sabitleniyor.</summary>
    [Authorize]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateCommentCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        var isAdmin = AdminAuth.IsStaffAdmin(User);
        if (!isAdmin)
        {
            var comment = await Mediator.Send(new GetCommentByIdQuery { Id = id }, cancellationToken);
            if (comment is not null)
            {
                var callerId = AdminAuth.GetUserId(User);
                if (callerId is null || comment.AuthorId != callerId)
                {
                    return Forbid();
                }

                command.AuthorId = comment.AuthorId;
            }
        }

        command.Id = id;
        await Mediator.Send(command, cancellationToken);
        return NoContent();
    }

    /// <summary>Bir Comment kaydını siler — CodeGen dışı: sahip/admin şartı elle eklendi (admin panelinin
    /// Yorum Moderasyonu ekranı da bu uca gidiyor).</summary>
    [Authorize]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (await IsOwnerOrAdminAsync(id, cancellationToken) == false)
        {
            return Forbid();
        }

        await Mediator.Send(new DeleteCommentCommand { Id = id }, cancellationToken);
        return NoContent();
    }

    /// <summary>
    /// Çağıran, yorumun yazarı mı (AuthorId) yoksa Admin/SuperAdmin mi? — CodeGen dışı, elle eklendi.
    /// Yorum yoksa null döner (asıl komut kendi NotFoundException'ını fırlatsın diye 404 burada taklit
    /// edilmiyor).
    /// </summary>
    private async Task<bool?> IsOwnerOrAdminAsync(Guid commentId, CancellationToken cancellationToken)
    {
        if (AdminAuth.IsStaffAdmin(User))
        {
            return true;
        }

        var comment = await Mediator.Send(new GetCommentByIdQuery { Id = commentId }, cancellationToken);
        if (comment is null)
        {
            return null;
        }

        var callerId = AdminAuth.GetUserId(User);
        return callerId is not null && comment.AuthorId == callerId;
    }
}
