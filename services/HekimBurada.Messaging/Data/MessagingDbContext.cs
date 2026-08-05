using BaseForge.Core.Interfaces;
using BaseForge.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Messaging.Entities;

namespace Messaging.Data;

/// <summary>Messaging servisinin EF Core context'i.</summary>
public sealed class MessagingDbContext : BaseForgeDbContext
{
    /// <summary>Yeni bir MessagingDbContext oluşturur.</summary>
    public MessagingDbContext(DbContextOptions<MessagingDbContext> options, ICurrentUser? currentUser = null, ICurrentTenant? currentTenant = null)
        : base(options, currentUser, currentTenant)
    {
    }

    /// <summary>Message tablosu.</summary>
    public DbSet<Message> Messages => Set<Message>();
}
