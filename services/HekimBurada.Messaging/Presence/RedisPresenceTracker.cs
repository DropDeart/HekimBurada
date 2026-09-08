using StackExchange.Redis;

namespace Messaging.Presence;

/// <summary>
/// <see cref="IPresenceTracker"/>'ın Redis tabanlı implementasyonu — CodeGen dışı, elle eklendi.
/// Anahtar başına bir TTL (yenilenmeyen bağlantılar için güvenlik ağı) konur; normal akışta
/// OnDisconnectedAsync sayaç düşürür, TTL yalnızca temiz kapanmayan bağlantılarda (tarayıcı çökmesi
/// vb.) sayacın sonsuza dek asılı kalmasını önler.
/// </summary>
public sealed class RedisPresenceTracker : IPresenceTracker
{
    private static readonly TimeSpan Ttl = TimeSpan.FromHours(6);
    private readonly IConnectionMultiplexer _redis;

    public RedisPresenceTracker(IConnectionMultiplexer redis)
    {
        _redis = redis;
    }

    private static string Key(Guid userId) => $"presence:{userId}";

    public async Task<bool> ConnectAsync(Guid userId)
    {
        var db = _redis.GetDatabase();
        var count = await db.StringIncrementAsync(Key(userId));
        await db.KeyExpireAsync(Key(userId), Ttl);
        return count == 1;
    }

    public async Task<bool> DisconnectAsync(Guid userId)
    {
        var db = _redis.GetDatabase();
        var count = await db.StringDecrementAsync(Key(userId));
        if (count <= 0)
        {
            await db.KeyDeleteAsync(Key(userId));
            return true;
        }

        return false;
    }

    public async Task<bool> IsOnlineAsync(Guid userId)
    {
        var db = _redis.GetDatabase();
        var value = await db.StringGetAsync(Key(userId));
        return value.HasValue && (long)value > 0;
    }
}
