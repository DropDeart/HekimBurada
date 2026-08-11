namespace Identity.Entities;

/// <summary>
/// Türkiye'nin 81 ilinden biri — RegionAdmin bölge ataması ve doktor kayıt formundaki il/ilçe seçimi
/// için referans veri. CodeGen tarafından üretilmez, elle eklendi (bkz. <see cref="District"/>,
/// <see cref="DoctorProfile.DistrictId"/>).
/// </summary>
public sealed class Province
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;
}
