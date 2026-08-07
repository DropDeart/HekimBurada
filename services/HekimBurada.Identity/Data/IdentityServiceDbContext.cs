using Identity.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Identity.Data;

/// <summary>
/// ASP.NET Core Identity + OpenIddict tablolarını barındıran EF Core context'i (identity_db).
/// </summary>
public sealed class IdentityServiceDbContext : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>
{
    public IdentityServiceDbContext(DbContextOptions<IdentityServiceDbContext> options)
        : base(options)
    {
    }

    /// <summary>Doktor doğrulama profilleri — CodeGen üretimi dışında, elle eklendi (bkz. <see cref="DoctorProfile"/>).</summary>
    public DbSet<DoctorProfile> DoctorProfiles => Set<DoctorProfile>();

    /// <summary>E-posta doğrulama kodları — CodeGen üretimi dışında, elle eklendi (bkz. <see cref="EmailOtp"/>).</summary>
    public DbSet<EmailOtp> EmailOtps => Set<EmailOtp>();

    /// <summary>Kayıt formunun uzmanlık alanı seçim listesi — CodeGen üretimi dışında, elle eklendi (bkz. <see cref="Specialty"/>).</summary>
    public DbSet<Specialty> Specialties => Set<Specialty>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.UseOpenIddict();

        builder.Entity<DoctorProfile>(entity =>
        {
            entity.HasIndex(p => p.UserId).IsUnique();
            entity.Property(p => p.Specialty).HasMaxLength(150).IsRequired();
            entity.Property(p => p.DiplomaNo).HasMaxLength(50).IsRequired();
            entity.Property(p => p.Region).HasMaxLength(100).IsRequired();
            entity.Property(p => p.VerificationStatus).HasMaxLength(20).IsRequired();
            entity.Property(p => p.VerificationDocumentPath).HasMaxLength(500);
            entity.Property(p => p.VerificationDocumentContentType).HasMaxLength(50);
        });

        builder.Entity<EmailOtp>(entity =>
        {
            entity.HasIndex(o => new { o.UserId, o.CreatedAt });
            entity.Property(o => o.CodeHash).HasMaxLength(64).IsRequired();
        });

        builder.Entity<Specialty>(entity =>
        {
            entity.HasIndex(s => s.Name).IsUnique();
            entity.Property(s => s.Name).HasMaxLength(150).IsRequired();
        });
    }
}
