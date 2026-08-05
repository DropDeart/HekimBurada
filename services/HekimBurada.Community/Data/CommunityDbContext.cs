using BaseForge.Core.Interfaces;
using BaseForge.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Community.Entities;

namespace Community.Data;

/// <summary>Community servisinin EF Core context'i.</summary>
public sealed class CommunityDbContext : BaseForgeDbContext
{
    /// <summary>Yeni bir CommunityDbContext oluşturur.</summary>
    public CommunityDbContext(DbContextOptions<CommunityDbContext> options, ICurrentUser? currentUser = null, ICurrentTenant? currentTenant = null)
        : base(options, currentUser, currentTenant)
    {
    }

    /// <summary>CommunityCategory tablosu.</summary>
    public DbSet<CommunityCategory> CommunityCategories => Set<CommunityCategory>();
    /// <summary>Membership tablosu.</summary>
    public DbSet<Membership> Memberships => Set<Membership>();
    /// <summary>Topic tablosu.</summary>
    public DbSet<Topic> Topics => Set<Topic>();
    /// <summary>Comment tablosu.</summary>
    public DbSet<Comment> Comments => Set<Comment>();
    /// <summary>Like tablosu.</summary>
    public DbSet<Like> Likes => Set<Like>();
}
