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

    /// <summary>Site geneli ayarlar (singleton) — CodeGen dışı, elle eklendi.</summary>
    public DbSet<SiteSettings> Settings => Set<SiteSettings>();

    /// <summary>Header/Footer navigasyon linkleri — CodeGen dışı, elle eklendi.</summary>
    public DbSet<MenuItem> MenuItems => Set<MenuItem>();

    /// <summary>Anasayfa hero carousel slaytları — CodeGen dışı, elle eklendi.</summary>
    public DbSet<CarouselSlide> CarouselSlides => Set<CarouselSlide>();

    /// <inheritdoc />
    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // DbSet property adı ("Settings") entity adından ("SiteSettings") farklı olduğu için EF'in
        // convention-based tablo adı tahmini yanlış olurdu — tablo adını elle sabitliyoruz.
        builder.Entity<SiteSettings>().ToTable("SiteSettings");

        builder.Entity<MenuItem>(entity =>
        {
            entity.Property(m => m.Location).HasMaxLength(30).IsRequired();
            entity.Property(m => m.Label).HasMaxLength(100).IsRequired();
            entity.Property(m => m.Url).HasMaxLength(500).IsRequired();
        });

        builder.Entity<CarouselSlide>(entity =>
        {
            entity.Property(c => c.ImageUrl).HasMaxLength(500).IsRequired();
        });
    }
}
