using BaseForge.API.Controllers;
using BaseForge.Core.CQRS;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Community.Authorization;
using Community.Features.Memberships;

namespace Community.Controllers;

/// <summary>Membership CRUD uçları. Otomatik üyelik senkronu (doktor onayında) HTTP dışından,
/// doğrudan DbContext üzerinden yazıyor (bkz. Integration/SyncMembershipOnDoctorProfileUpdated.cs) —
/// bu uçlar yalnızca doğrudan API çağrıları için geçerli.</summary>
[Authorize]
[Route("api/[controller]")]
public sealed class MembershipsController : BaseController
{
    /// <summary>Kimliğe göre tek bir Membership getirir.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<MembershipDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetMembershipByIdQuery { Id = id }, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    /// <summary>Membership kayıtlarını sayfalı listeler (query string: page, pageSize, sortBy, search).</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<MembershipDto>>> List([FromQuery] ListMembershipQuery query, CancellationToken cancellationToken)
        => Ok(await Mediator.Send(query, cancellationToken));

    /// <summary>Yeni bir Membership oluşturur (topluluğa katılma) — CodeGen dışı: UserId sahtekarlığını
    /// önlemek için çağıranın kendi kimliğiyle elle ezildi. Bir kullanıcı birden fazla topluluğa
    /// katılabilir — kısıt yok. Kategorinin ilk üyesiyse IsAdmin=true olarak işaretlenir (bkz.
    /// Membership.IsAdmin doc yorumu).</summary>
    [HttpPost]
    public async Task<ActionResult<Guid>> Create(CreateMembershipCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        var callerId = AdminAuth.GetUserId(User);
        if (callerId is null)
        {
            return Forbid();
        }

        command.UserId = callerId.Value;
        command.IsAdmin = await IsFirstMemberOfCategoryAsync(command.CategoryId, cancellationToken);
        var id = await Mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id }, id);
    }

    /// <summary>Var olan bir Membership kaydını günceller — CodeGen dışı: sahip/admin şartı elle eklendi.
    /// Update komutu tüm alanları eziyor; admin olmayan çağıran UserId'yi başkasına devredemesin diye
    /// alan orijinal değerine sabitleniyor.</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateMembershipCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        var isAdmin = AdminAuth.IsStaffAdmin(User);
        if (!isAdmin)
        {
            var membership = await Mediator.Send(new GetMembershipByIdQuery { Id = id }, cancellationToken);
            if (membership is not null)
            {
                var callerId = AdminAuth.GetUserId(User);
                if (callerId is null || membership.UserId != callerId)
                {
                    return Forbid();
                }

                command.UserId = membership.UserId;
            }
        }

        command.Id = id;
        await Mediator.Send(command, cancellationToken);
        return NoContent();
    }

    /// <summary>Bir Membership kaydını siler — kendi üyeliğinden ayrılma (leave) veya aynı topluluğun
    /// admin'i başka bir üyeyi çıkarma (kick) için — CodeGen dışı, elle eklendi.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (await CanRemoveAsync(id, cancellationToken) == false)
        {
            return Forbid();
        }

        await Mediator.Send(new DeleteMembershipCommand { Id = id }, cancellationToken);
        return NoContent();
    }

    /// <summary>Çağıran; üyeliğin sahibi mi (kendi çıkışı), aynı topluluğun admin'i mi (üye çıkarma)
    /// yoksa site Admin/SuperAdmin mi? — CodeGen dışı, elle eklendi. Kayıt yoksa null döner (asıl komut
    /// kendi NotFoundException'ını fırlatsın).</summary>
    private async Task<bool?> CanRemoveAsync(Guid membershipId, CancellationToken cancellationToken)
    {
        if (AdminAuth.IsStaffAdmin(User))
        {
            return true;
        }

        var membership = await Mediator.Send(new GetMembershipByIdQuery { Id = membershipId }, cancellationToken);
        if (membership is null)
        {
            return null;
        }

        var callerId = AdminAuth.GetUserId(User);
        if (callerId is null)
        {
            return false;
        }

        if (membership.UserId == callerId)
        {
            return true;
        }

        var allMemberships = await GetAllMembershipsAsync(cancellationToken);
        return allMemberships.Any(
            m => m.CategoryId == membership.CategoryId && m.UserId == callerId && m.IsAdmin);
    }

    /// <summary>Verilen kategoride hiç üye yoksa true döner — ilk katılan otomatik topluluk admin'i olur
    /// (bkz. Membership.IsAdmin doc yorumu). CodeGen dışı, elle eklendi. Not: eşzamanlı iki katılım
    /// teorik olarak ikisini de admin yapabilir — düşük riskli bir topluluk özelliği için kabul edilebilir,
    /// kilitleme eklenmedi.</summary>
    private async Task<bool> IsFirstMemberOfCategoryAsync(Guid categoryId, CancellationToken cancellationToken)
    {
        var allMemberships = await GetAllMembershipsAsync(cancellationToken);
        return !allMemberships.Any(m => m.CategoryId == categoryId);
    }

    /// <summary>Tüm Membership kayıtlarını sayfalayarak toplar — CodeGen dışı, elle eklendi.
    /// ListMembershipQuery'nin PageSize'ı sunucuda 100'e sabitlenir (bkz. BaseForge.Core.CQRS.
    /// PagedRequest), tek sayfa istemek 100'den fazla üyelikte admin/ilk-üye kontrollerini sessizce
    /// yanlış sonuçlandırırdı.</summary>
    private async Task<List<MembershipDto>> GetAllMembershipsAsync(CancellationToken cancellationToken)
    {
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

        return all;
    }
}
