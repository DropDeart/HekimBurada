using BaseForge.Core.Interfaces;
using BaseForge.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Gateway.Entities;

namespace Gateway.Data;

/// <summary>Gateway servisinin EF Core context'i.</summary>
public sealed class GatewayDbContext : BaseForgeDbContext
{
    /// <summary>Yeni bir GatewayDbContext oluşturur.</summary>
    public GatewayDbContext(DbContextOptions<GatewayDbContext> options, ICurrentUser? currentUser = null, ICurrentTenant? currentTenant = null)
        : base(options, currentUser, currentTenant)
    {
    }

    /// <summary>Announcement tablosu.</summary>
    public DbSet<Announcement> Announcements => Set<Announcement>();
}
