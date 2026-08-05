namespace Messaging.Integration;

/// <summary>
/// marketplace/Offer servisine senkron (gRPC) erişim sözleşmesi (stub).
/// Gerçek gRPC istemcisi ve .proto dosyası ayrıca eklenmelidir; bu servis
/// uzak kaydın yalnızca kimliğini tutar (cross-DB FK yoktur).
/// </summary>
public interface IOfferClient
{
    /// <summary>Uzak servisten Offer referansını getirir.</summary>
    Task<OfferReference?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
}

/// <summary>Uzak Offer kaydının yerel referans görünümü.</summary>
public sealed class OfferReference
{
    /// <summary>Uzak kaydın kimliği.</summary>
    public Guid Id { get; set; }
}
