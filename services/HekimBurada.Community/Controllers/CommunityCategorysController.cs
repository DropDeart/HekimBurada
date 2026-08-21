using BaseForge.API.Controllers;
using BaseForge.Core.CQRS;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Community.Authorization;
using Community.Features.CommunityCategorys;
using Community.Features.Memberships;

namespace Community.Controllers;

/// <summary>CommunityCategory CRUD uçları. Oluşturma (Create) her doğrulanmış doktora açık — oluşturan
/// otomatik ilk üye + moderatör olur (bkz. CreateCommunityCategoryHandler). Düzenleme (Update) site
/// Admin/SuperAdmin'e veya topluluğun moderatörüne (aynı kategoride IsAdmin üyesi) açık; silme (Delete)
/// yalnızca Admin/SuperAdmin'de kalıyor. CodeGen dışı elle eklendi.</summary>
[Authorize]
[Route("api/[controller]")]
public sealed class CommunityCategorysController : BaseController
{
    /// <summary>Kimliğe göre tek bir CommunityCategory getirir.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CommunityCategoryDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetCommunityCategoryByIdQuery { Id = id }, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    /// <summary>CommunityCategory kayıtlarını sayfalı listeler (query string: page, pageSize, sortBy, search).</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<CommunityCategoryDto>>> List([FromQuery] ListCommunityCategoryQuery query, CancellationToken cancellationToken)
        => Ok(await Mediator.Send(query, cancellationToken));

    /// <summary>Yeni bir CommunityCategory oluşturur — CodeGen dışı: her doğrulanmış doktora açık,
    /// CreatorId sahtekarlığını önlemek için çağıranın kendi kimliğiyle elle ezildi.</summary>
    [HttpPost]
    public async Task<ActionResult<Guid>> Create(CreateCommunityCategoryCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        var callerId = AdminAuth.GetUserId(User);
        if (callerId is null)
        {
            return Forbid();
        }

        command.CreatorId = callerId.Value;
        var id = await Mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id }, id);
    }

    /// <summary>Var olan bir CommunityCategory kaydını günceller — CodeGen dışı: site Admin/SuperAdmin
    /// veya topluluğun moderatörü (aynı kategoride IsAdmin üyesi) yapabilir.</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateCommunityCategoryCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        if (await IsAdminOfCategoryAsync(id, cancellationToken) == false)
        {
            return Forbid();
        }

        command.Id = id;
        await Mediator.Send(command, cancellationToken);
        return NoContent();
    }

    /// <summary>Çağıran, site Admin/SuperAdmin mi yoksa bu kategoride moderatör (IsAdmin üye) mi? —
    /// CodeGen dışı, elle eklendi (bkz. MembershipsController.CanRemoveAsync aynı kalıp).</summary>
    private async Task<bool> IsAdminOfCategoryAsync(Guid categoryId, CancellationToken cancellationToken)
    {
        if (AdminAuth.IsStaffAdmin(User))
        {
            return true;
        }

        var callerId = AdminAuth.GetUserId(User);
        if (callerId is null)
        {
            return false;
        }

        var all = new List<MembershipDto>();
        var page = 1;
        while (true)
        {
            var result = await Mediator.Send(new ListMembershipQuery { Page = page, PageSize = 100 }, cancellationToken);
            all.AddRange(result.Items);
            if (all.Count >= result.TotalCount || result.Items.Count == 0)
            {
                break;
            }

            page++;
        }

        return all.Any(m => m.CategoryId == categoryId && m.UserId == callerId.Value && m.IsAdmin);
    }

    /// <summary>Bir CommunityCategory kaydını siler — CodeGen dışı: Admin/SuperAdmin şartı elle eklendi.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (!AdminAuth.IsStaffAdmin(User))
        {
            return Forbid();
        }

        await Mediator.Send(new DeleteCommunityCategoryCommand { Id = id }, cancellationToken);
        return NoContent();
    }
}
