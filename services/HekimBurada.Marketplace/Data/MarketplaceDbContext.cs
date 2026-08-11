using BaseForge.Core.Interfaces;
using BaseForge.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Marketplace.Entities;

namespace Marketplace.Data;

/// <summary>Marketplace servisinin EF Core context'i.</summary>
public sealed class MarketplaceDbContext : BaseForgeDbContext
{
    /// <summary>Yeni bir MarketplaceDbContext oluşturur.</summary>
    public MarketplaceDbContext(DbContextOptions<MarketplaceDbContext> options, ICurrentUser? currentUser = null, ICurrentTenant? currentTenant = null)
        : base(options, currentUser, currentTenant)
    {
    }

    /// <summary>Category tablosu.</summary>
    public DbSet<Category> Categories => Set<Category>();
    /// <summary>Listing tablosu.</summary>
    public DbSet<Listing> Listings => Set<Listing>();
    /// <summary>Offer tablosu.</summary>
    public DbSet<Offer> Offers => Set<Offer>();
    /// <summary>Request tablosu.</summary>
    public DbSet<Request> Requests => Set<Request>();
    /// <summary>Favorite tablosu.</summary>
    public DbSet<Favorite> Favorites => Set<Favorite>();
    /// <summary>ListingReview tablosu — CodeGen dışı, elle eklendi.</summary>
    public DbSet<ListingReview> ListingReviews => Set<ListingReview>();
    /// <summary>Order tablosu — CodeGen dışı, elle eklendi.</summary>
    public DbSet<Order> Orders => Set<Order>();
    /// <summary>RequestOffer tablosu — CodeGen dışı, elle eklendi.</summary>
    public DbSet<RequestOffer> RequestOffers => Set<RequestOffer>();
}
