namespace Identity.Entities;

/// <summary>
/// Bir kullanıcının kayıtlı teslimat/fatura adresi (Profil &gt; Adres Bilgilerim). CodeGen tarafından
/// üretilmez, elle bakımı yapılır — bkz. <see cref="DoctorProfile"/> ile aynı desen.
/// </summary>
public sealed class Address
{
    public Guid Id { get; set; }

    /// <summary>ApplicationUser.Id — bir kullanıcının birden çok adresi olabilir.</summary>
    public Guid UserId { get; set; }

    /// <summary>Örn. "Muayenehane", "Ev".</summary>
    public string Title { get; set; } = string.Empty;

    public string FullAddress { get; set; } = string.Empty;

    public string City { get; set; } = string.Empty;

    public string? District { get; set; }

    public string? Phone { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
