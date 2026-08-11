namespace Identity.Entities;

/// <summary>
/// Bir ile bağlı ilçe — <see cref="DoctorProfile.DistrictId"/>'nin işaret ettiği referans veri.
/// Önceden serbest metin olan Region alanı, il/ilçe adlarının farklı yazımlarda (örn. "istanbul" /
/// "İstanbul") girilip RegionAdmin'in bölge kuyruğunu sessizce boş göstermesine yol açıyordu — bunun
/// yerine kapalı bir küme kullanılıyor. CodeGen tarafından üretilmez, elle eklendi.
/// </summary>
public sealed class District
{
    public Guid Id { get; set; }

    public Guid ProvinceId { get; set; }

    public string Name { get; set; } = string.Empty;
}
