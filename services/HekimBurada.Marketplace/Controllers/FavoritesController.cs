using BaseForge.API.Controllers;
using BaseForge.Core.CQRS;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Marketplace.Authorization;
using Marketplace.Features.Favorites;

namespace Marketplace.Controllers;

/// <summary>Favorite CRUD uçları.</summary>
[Authorize]
[Route("api/[controller]")]
public sealed class FavoritesController : BaseController
{
    /// <summary>Kimliğe göre tek bir Favorite getirir.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<FavoriteDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetFavoriteByIdQuery { Id = id }, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    /// <summary>Favorite kayıtlarını sayfalı listeler (query string: page, pageSize, sortBy, search).</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<FavoriteDto>>> List([FromQuery] ListFavoriteQuery query, CancellationToken cancellationToken)
        => Ok(await Mediator.Send(query, cancellationToken));

    /// <summary>Yeni bir Favorite oluşturur — CodeGen dışı: UserId sahtekarlığını önlemek için
    /// çağıranın kendi kimliğiyle elle ezildi (client-supplied değerine güvenilmiyor).</summary>
    [HttpPost]
    public async Task<ActionResult<Guid>> Create(CreateFavoriteCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        var callerId = AdminAuth.GetUserId(User);
        if (callerId is null)
        {
            return Forbid();
        }

        command.UserId = callerId.Value;
        var id = await Mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id }, id);
    }

    /// <summary>Var olan bir Favorite kaydını günceller — CodeGen dışı: sahip/admin şartı elle eklendi.
    /// Update komutu tüm alanları eziyor; admin olmayan çağıran UserId'yi başkasına devredemesin diye
    /// alan orijinal değerine sabitleniyor.</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateFavoriteCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        var isAdmin = AdminAuth.IsStaffAdmin(User);
        if (!isAdmin)
        {
            var favorite = await Mediator.Send(new GetFavoriteByIdQuery { Id = id }, cancellationToken);
            if (favorite is not null)
            {
                var callerId = AdminAuth.GetUserId(User);
                if (callerId is null || favorite.UserId != callerId)
                {
                    return Forbid();
                }

                command.UserId = favorite.UserId;
            }
        }

        command.Id = id;
        await Mediator.Send(command, cancellationToken);
        return NoContent();
    }

    /// <summary>Bir Favorite kaydını siler — CodeGen dışı: sahip/admin şartı elle eklendi.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (await IsOwnerOrAdminAsync(id, cancellationToken) == false)
        {
            return Forbid();
        }

        await Mediator.Send(new DeleteFavoriteCommand { Id = id }, cancellationToken);
        return NoContent();
    }

    /// <summary>Çağıran, favorinin sahibi mi (UserId) yoksa Admin/SuperAdmin mi? — CodeGen dışı, elle
    /// eklendi. Kayıt yoksa null döner (asıl komut kendi NotFoundException'ını fırlatsın).</summary>
    private async Task<bool?> IsOwnerOrAdminAsync(Guid favoriteId, CancellationToken cancellationToken)
    {
        if (AdminAuth.IsStaffAdmin(User))
        {
            return true;
        }

        var favorite = await Mediator.Send(new GetFavoriteByIdQuery { Id = favoriteId }, cancellationToken);
        if (favorite is null)
        {
            return null;
        }

        var callerId = AdminAuth.GetUserId(User);
        return callerId is not null && favorite.UserId == callerId;
    }
}
