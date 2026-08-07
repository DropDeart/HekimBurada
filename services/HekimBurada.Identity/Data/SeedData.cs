using Identity.Configuration;
using Identity.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using OpenIddict.Abstractions;
using static OpenIddict.Abstractions.OpenIddictConstants;

namespace Identity.Data;

/// <summary>İlk açılışta OpenIddict scope/client'larını ve admin kullanıcıyı <see cref="AuthOptions"/>'tan oluşturur.</summary>
public static class SeedData
{
    public static async Task SeedAsync(IServiceProvider services, AuthOptions auth, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(auth);
        await SeedScopesAsync(services, auth, cancellationToken);
        await SeedClientsAsync(services, auth, cancellationToken);
        await SeedAdminAsync(services, auth);
        await SeedSpecialtiesAsync(services, cancellationToken);
    }

    /// <summary>
    /// Kayıt formunun uzmanlık alanı listesini yaygın Türkçe branşlarla doldurur (tablo boşsa).
    /// Bilinçli olarak bir "Diğer" seçeneği eklenmez — listede olmayan bir alanla kayıt olunamaz,
    /// SuperAdmin gerektiğinde ekler (bkz. SpecialtiesApiController).
    /// </summary>
    private static async Task SeedSpecialtiesAsync(IServiceProvider services, CancellationToken ct)
    {
        var db = services.GetRequiredService<IdentityServiceDbContext>();
        if (await db.Specialties.AnyAsync(ct))
        {
            return;
        }

        string[] defaults =
        [
            "Aile Hekimliği",
            "Anesteziyoloji ve Reanimasyon",
            "Çocuk Sağlığı ve Hastalıkları",
            "Dahiliye",
            "Dermatoloji",
            "Genel Cerrahi",
            "Göz Hastalıkları",
            "Kadın Hastalıkları ve Doğum",
            "Kardiyoloji",
            "Kulak Burun Boğaz",
            "Nöroloji",
            "Ortopedi ve Travmatoloji",
            "Psikiyatri",
            "Radyoloji",
            "Üroloji",
        ];

        db.Specialties.AddRange(defaults.Select(name => new Specialty { Id = Guid.NewGuid(), Name = name }));
        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedScopesAsync(IServiceProvider services, AuthOptions auth, CancellationToken ct)
    {
        var manager = services.GetRequiredService<IOpenIddictScopeManager>();
        foreach (var scope in auth.Scopes)
        {
            if (string.IsNullOrWhiteSpace(scope.Name) || await manager.FindByNameAsync(scope.Name, ct) is not null)
            {
                continue;
            }

            var descriptor = new OpenIddictScopeDescriptor { Name = scope.Name, DisplayName = scope.Name };
            if (!string.IsNullOrWhiteSpace(scope.Resource))
            {
                descriptor.Resources.Add(scope.Resource);
            }

            await manager.CreateAsync(descriptor, ct);
        }
    }

    /// <summary>
    /// Client'ları appsettings'ten oluşturur/günceller — var olan bir client artık sadece atlanmıyor,
    /// izinleri (grant/scope/redirect) her açılışta appsettings'teki güncel haliyle senkronize ediliyor.
    /// Önceden "zaten varsa dokunma" mantığı vardı: appsettings'e sonradan eklenen bir scope/grant
    /// (örn. offline_access) DB'deki client zaten seed edilmiş olduğu için sessizce hiç uygulanmıyordu.
    /// </summary>
    private static async Task SeedClientsAsync(IServiceProvider services, AuthOptions auth, CancellationToken ct)
    {
        var manager = services.GetRequiredService<IOpenIddictApplicationManager>();
        foreach (var client in auth.Clients)
        {
            if (string.IsNullOrWhiteSpace(client.ClientId))
            {
                continue;
            }

            var existing = await manager.FindByClientIdAsync(client.ClientId, ct);

            var descriptor = new OpenIddictApplicationDescriptor
            {
                ClientId = client.ClientId,
                ClientType = client.Public ? ClientTypes.Public : ClientTypes.Confidential,
                DisplayName = client.ClientId,
            };

            if (!client.Public && !string.IsNullOrWhiteSpace(client.Secret))
            {
                descriptor.ClientSecret = client.Secret;
            }

            descriptor.Permissions.Add(Permissions.Endpoints.Token);

            foreach (var grant in client.Grants)
            {
                switch (grant.Trim().ToLowerInvariant())
                {
                    case "password":
                        descriptor.Permissions.Add(Permissions.GrantTypes.Password);
                        break;
                    case "client_credentials":
                        descriptor.Permissions.Add(Permissions.GrantTypes.ClientCredentials);
                        break;
                    case "refresh_token":
                        descriptor.Permissions.Add(Permissions.GrantTypes.RefreshToken);
                        break;
                    case "authorization_code":
                        descriptor.Permissions.Add(Permissions.GrantTypes.AuthorizationCode);
                        descriptor.Permissions.Add(Permissions.ResponseTypes.Code);
                        descriptor.Permissions.Add(Permissions.Endpoints.Authorization);
                        break;
                    default:
                        break;
                }
            }

            foreach (var scope in client.Scopes)
            {
                descriptor.Permissions.Add(Permissions.Prefixes.Scope + scope);
            }

            foreach (var uri in client.RedirectUris)
            {
                descriptor.RedirectUris.Add(new Uri(uri));
            }

            if (existing is null)
            {
                await manager.CreateAsync(descriptor, ct);
            }
            else
            {
                await manager.UpdateAsync(existing, descriptor, ct);
            }
        }
    }

    private static async Task SeedAdminAsync(IServiceProvider services, AuthOptions auth)
    {
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        foreach (var role in new[] { AdminRole, UserRole, SuperAdminRole, RegionAdminRole })
        {
            if (await roleManager.FindByNameAsync(role) is null)
            {
                await roleManager.CreateAsync(new IdentityRole<Guid>(role));
            }
        }

        if (auth.SeedAdmin is null || string.IsNullOrWhiteSpace(auth.SeedAdmin.Email))
        {
            return;
        }

        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
        var admin = await userManager.FindByNameAsync(auth.SeedAdmin.Email);
        if (admin is null)
        {
            admin = new ApplicationUser
            {
                UserName = auth.SeedAdmin.Email,
                Email = auth.SeedAdmin.Email,
                EmailConfirmed = true,
                FullName = "Administrator",
            };
            var createResult = await userManager.CreateAsync(admin, auth.SeedAdmin.Password);
            if (!createResult.Succeeded)
            {
                var reasons = string.Join("; ", createResult.Errors.Select(e => e.Description));
                throw new InvalidOperationException(
                    $"Seed admin kullanıcısı ('{auth.SeedAdmin.Email}') oluşturulamadı: {reasons} " +
                    "— appsettings 'Auth:SeedAdmin:Password' (veya .env 'Auth__SeedAdmin__Password') parola " +
                    "politikasına uygun olmalı (en az 8 karakter, büyük/küçük harf, rakam, özel karakter).");
            }
        }

        if (!await userManager.IsInRoleAsync(admin, AdminRole))
        {
            await userManager.AddToRoleAsync(admin, AdminRole);
        }

        // Seed admin, doktor doğrulama kuyruğunu de baştan görebilsin diye SuperAdmin de alır
        // (bölge kısıtı yok — tüm bölgeleri onaylayabilir).
        if (!await userManager.IsInRoleAsync(admin, SuperAdminRole))
        {
            await userManager.AddToRoleAsync(admin, SuperAdminRole);
        }
    }

    /// <summary>Kullanıcı listesi gibi genel yönetim sayfalarına erişim için rol adı.</summary>
    public const string AdminRole = "Admin";

    /// <summary>Kayıt olan/eklenen her kullanıcıya varsayılan olarak atanan rol.</summary>
    public const string UserRole = "User";

    /// <summary>Doktor doğrulama kuyruğunu bölge kısıtı olmadan tam gören admin rolü.</summary>
    public const string SuperAdminRole = "SuperAdmin";

    /// <summary>
    /// Doktor doğrulama kuyruğunu yalnızca kendi bölgesiyle (<see cref="RegionClaimType"/> claim'i)
    /// sınırlı gören admin rolü.
    /// </summary>
    public const string RegionAdminRole = "RegionAdmin";

    /// <summary>RegionAdmin kullanıcısının sorumlu olduğu bölgeyi taşıyan claim tipi.</summary>
    public const string RegionClaimType = "region";
}
