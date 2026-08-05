using BaseForge.Core.Exceptions;

namespace Marketplace.Integration;

/// <summary>
/// HekimBurada'nın kapalı-platform kuralı: yalnızca admin onaylı ("approved") doktorlar ilan/talep
/// oluşturabilir. CodeGen dışı, elle eklendi — Identity'ye gRPC ile canlı sorgulanır (JWT'ye
/// gömülmez, bkz. plan Faz C "Doğrulama kapısı" kararı).
/// </summary>
internal static class VerificationGate
{
    public static async Task EnsureApprovedAsync(IUserClient userClient, Guid userId, CancellationToken cancellationToken)
    {
        var user = await userClient.GetByIdAsync(userId, cancellationToken);
        if (user is null || user.VerificationStatus != "approved")
        {
            throw new ValidationException(
                "VerificationStatus",
                "Bu işlem için doktor doğrulamanızın admin tarafından onaylanmış olması gerekir.");
        }
    }
}
