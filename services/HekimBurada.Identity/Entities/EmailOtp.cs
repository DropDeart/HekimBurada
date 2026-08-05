namespace Identity.Entities;

/// <summary>
/// Kayıt sonrası e-posta doğrulaması için tek kullanımlık 6 haneli kod. CodeGen dışı, elle eklendi.
/// Bir kullanıcı için her zaman EN SON (CreatedAt'e göre) satır geçerli kabul edilir — yeniden
/// gönderim (resend) eskisini ayrıca iptal etmeye gerek bırakmadan doğal olarak geçersiz kılar.
/// </summary>
public sealed class EmailOtp
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    /// <summary>Kodun kendisi asla saklanmaz — yalnızca SHA-256 hash'i.</summary>
    public string CodeHash { get; set; } = string.Empty;

    public DateTimeOffset ExpiresAt { get; set; }

    public DateTimeOffset? ConsumedAt { get; set; }

    /// <summary>Art arda yanlış deneme sayısı — bir eşiği aşınca kod geçersiz sayılır (brute-force koruması).</summary>
    public int FailedAttempts { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
