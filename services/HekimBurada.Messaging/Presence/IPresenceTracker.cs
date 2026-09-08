namespace Messaging.Presence;

/// <summary>
/// Bir kullanıcının şu an kaç aktif SignalR bağlantısı olduğunu (0 = çevrimdışı) izler — CodeGen dışı,
/// elle eklendi. Sayaç tutulur (tek bir bool yerine) çünkü aynı kullanıcı birden fazla sekme/cihazda
/// açık olabilir; bir bağlantı kapanınca diğerleri açıksa kullanıcı yine çevrimiçi sayılmalı.
/// </summary>
public interface IPresenceTracker
{
    /// <summary>Bağlantı sayacını bir artırır, sonuç 1'e ulaştıysa (yeni çevrimiçi) true döner.</summary>
    Task<bool> ConnectAsync(Guid userId);

    /// <summary>Bağlantı sayacını bir azaltır, sonuç 0'a düştüyse (artık çevrimdışı) true döner.</summary>
    Task<bool> DisconnectAsync(Guid userId);

    Task<bool> IsOnlineAsync(Guid userId);
}
