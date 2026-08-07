namespace Identity.Entities;

/// <summary>
/// Kayıt formundaki "Uzmanlık Alanı" seçilebilir listesi — serbest metin yerine kapalı bir küme.
/// Community'nin <c>SyncMembershipOnDoctorProfileUpdated</c>'i doktoru topluluk kategorisine birebir
/// string eşleşmesiyle atadığından ("Kardiyoloji" ile "kardiyo" farklı kategoriler oluşturur),
/// kanonik bir liste kullanmak topluluğun bölünmesini önler. CodeGen tarafından üretilmez, elle eklendi.
/// </summary>
public sealed class Specialty
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
