using BaseForge.API.Controllers;
using BaseForge.Core.CQRS;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Community.Authorization;
using Community.Data;
using Community.Features.Topics;

namespace Community.Controllers;

/// <summary>Topic CRUD uçları. Okuma (GetById/List) herkese açık — SEO ve giriş yapmamış ziyaretçiler
/// için — ancak konunun bağlı olduğu CommunityCategory kapalıysa (IsClosed) anonim çağırana içerik
/// gösterilmez. Yazma (Create/Update/Delete) her zaman giriş gerektirir. CodeGen dışı elle eklendi.</summary>
[Route("api/[controller]")]
public sealed class TopicsController : BaseController
{
    /// <summary>Kimliğe göre tek bir Topic getirir — kapalı topluluğun konusu anonime 401 döner.</summary>
    [AllowAnonymous]
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TopicDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetTopicByIdQuery { Id = id }, cancellationToken);
        if (result is null)
        {
            return NotFound();
        }

        if (!(User.Identity?.IsAuthenticated ?? false) && await IsCategoryClosedAsync(result.CategoryId, cancellationToken))
        {
            return Unauthorized();
        }

        return Ok(result);
    }

    /// <summary>Topic kayıtlarını sayfalı listeler (query string: page, pageSize, sortBy, search) —
    /// anonim çağırana kapalı topluluklara ait konular filtrelenir (TotalCount filtre öncesi kalır).</summary>
    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<PagedResult<TopicDto>>> List([FromQuery] ListTopicQuery query, CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(query, cancellationToken);
        if (User.Identity?.IsAuthenticated ?? false)
        {
            return Ok(result);
        }

        var openCategoryIds = await GetOpenCategoryIdsAsync(cancellationToken);
        return Ok(new PagedResult<TopicDto>
        {
            Items = result.Items.Where(t => openCategoryIds.Contains(t.CategoryId)).ToList(),
            TotalCount = result.TotalCount,
            Page = result.Page,
            PageSize = result.PageSize,
        });
    }

    /// <summary>İlgili kategori kapalı mı? — CodeGen dışı, elle eklendi.</summary>
    private async Task<bool> IsCategoryClosedAsync(Guid categoryId, CancellationToken cancellationToken)
    {
        var db = HttpContext.RequestServices.GetRequiredService<CommunityDbContext>();
        return await db.CommunityCategories
            .Where(c => c.Id == categoryId)
            .Select(c => c.IsClosed)
            .FirstOrDefaultAsync(cancellationToken);
    }

    /// <summary>Kapalı olmayan (herkese açık) kategorilerin id kümesi — CodeGen dışı, elle eklendi.</summary>
    private async Task<HashSet<Guid>> GetOpenCategoryIdsAsync(CancellationToken cancellationToken)
    {
        var db = HttpContext.RequestServices.GetRequiredService<CommunityDbContext>();
        var ids = await db.CommunityCategories
            .Where(c => !c.IsClosed)
            .Select(c => c.Id)
            .ToListAsync(cancellationToken);
        return ids.ToHashSet();
    }

    /// <summary>Yeni bir Topic oluşturur — CodeGen dışı: AuthorId sahtekarlığını önlemek için
    /// çağıranın kendi kimliğiyle elle ezildi (client-supplied değerine güvenilmiyor).</summary>
    [Authorize]
    [HttpPost]
    public async Task<ActionResult<Guid>> Create(CreateTopicCommand command, CancellationToken cancellationToken)
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

    /// <summary>Var olan bir Topic kaydını günceller — CodeGen dışı: sahip/admin şartı elle eklendi.
    /// Update komutu tüm alanları eziyor; admin olmayan çağıran AuthorId'yi başkasına devredemesin diye
    /// alan orijinal değerine sabitleniyor.</summary>
    [Authorize]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateTopicCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        var isAdmin = AdminAuth.IsStaffAdmin(User);
        if (!isAdmin)
        {
            var topic = await Mediator.Send(new GetTopicByIdQuery { Id = id }, cancellationToken);
            if (topic is not null)
            {
                var callerId = AdminAuth.GetUserId(User);
                if (callerId is null || topic.AuthorId != callerId)
                {
                    return Forbid();
                }

                command.AuthorId = topic.AuthorId;
            }
        }

        command.Id = id;
        await Mediator.Send(command, cancellationToken);
        return NoContent();
    }

    /// <summary>Bir Topic kaydını siler — CodeGen dışı: sahip/admin şartı elle eklendi.</summary>
    [Authorize]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (await IsOwnerOrAdminAsync(id, cancellationToken) == false)
        {
            return Forbid();
        }

        await Mediator.Send(new DeleteTopicCommand { Id = id }, cancellationToken);
        return NoContent();
    }

    /// <summary>Çağıran, konunun yazarı mı (AuthorId) yoksa Admin/SuperAdmin mi? — CodeGen dışı, elle
    /// eklendi. Konu yoksa null döner (asıl komut kendi NotFoundException'ını fırlatsın).</summary>
    private async Task<bool?> IsOwnerOrAdminAsync(Guid topicId, CancellationToken cancellationToken)
    {
        if (AdminAuth.IsStaffAdmin(User))
        {
            return true;
        }

        var topic = await Mediator.Send(new GetTopicByIdQuery { Id = topicId }, cancellationToken);
        if (topic is null)
        {
            return null;
        }

        var callerId = AdminAuth.GetUserId(User);
        return callerId is not null && topic.AuthorId == callerId;
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
