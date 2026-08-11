namespace Identity.Entities;

/// <summary>
/// Bir doktor kullanıcısının HekimBurada'ya özgü profil/doğrulama bilgileri. <see cref="ApplicationUser"/>'ı
/// 1:1 genişletir (ayrı tablo — BaseForge.CodeGen'in ürettiği/beklediği ApplicationUser şemasına
/// (Id/UserName/Email/FullName) dokunmadan). CodeGen tarafından üretilmez, elle bakımı yapılır.
/// </summary>
public sealed class DoctorProfile
{
    public Guid Id { get; set; }

    /// <summary>ApplicationUser.Id — 1:1 ilişki.</summary>
    public Guid UserId { get; set; }

    public string Specialty { get; set; } = string.Empty;

    public string DiplomaNo { get; set; } = string.Empty;

    /// <summary>
    /// <see cref="Entities.District"/>'e referans — bölge admini yetkilendirmesinde ve elden teslim
    /// şehir eşleşmesinde kullanılır. Önceden serbest metin (Region) idi; il/ilçe referans tablosuna
    /// geçirildi (bkz. <see cref="Entities.District"/> doc yorumu).
    /// </summary>
    public Guid DistrictId { get; set; }

    public string VerificationStatus { get; set; } = DoctorVerificationStatus.Pending;

    /// <summary>Yüklenen belgenin, upload volume köküne göre göreli yolu (örn. <c>doctors/{userId}/{guid}.jpg</c>).</summary>
    public string? VerificationDocumentPath { get; set; }

    /// <summary>Yalnızca <c>image/jpeg</c> veya <c>image/png</c> — yükleme sırasında doğrulanır.</summary>
    public string? VerificationDocumentContentType { get; set; }

    public DateTimeOffset? VerifiedAt { get; set; }

    /// <summary>Onay/red kararını veren admin kullanıcının Id'si.</summary>
    public Guid? VerifiedByAdminId { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

/// <summary>string tipli durum sabitleri — BaseForge'un CodeGen'inde de olduğu gibi enum yerine tercih edilir.</summary>
public static class DoctorVerificationStatus
{
    public const string Pending = "pending";
    public const string Approved = "approved";
    public const string Rejected = "rejected";
}
