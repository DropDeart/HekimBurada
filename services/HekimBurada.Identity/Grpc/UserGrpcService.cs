using Identity.Data;
using Identity.Entities;
using Grpc.Core;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Identity.Grpc;

/// <summary>
/// Merkez kullanıcı entity'sine (<see cref="ApplicationUser"/>) diğer servislerin salt-okunur gRPC erişimi.
/// Servis adı proto'daki <c>UserService</c> ile çakışmasın diye <c>UserGrpcService</c> olarak adlandırıldı.
/// </summary>
public sealed class UserGrpcService(UserManager<ApplicationUser> userManager, IdentityServiceDbContext db) : UserService.UserServiceBase
{
    public override async Task<UserMessage> GetById(UserByIdRequest request, ServerCallContext context)
    {
        var user = await userManager.FindByIdAsync(request.Id)
            ?? throw new RpcException(new Status(StatusCode.NotFound, $"User '{request.Id}' bulunamadı."));

        // DoctorProfile CodeGen'in üretmediği, elle eklenen bir tablo (bkz. Entities/DoctorProfile.cs)
        // — sosyal girişle oluşmuş ama henüz profilini tamamlamamış kullanıcılarda satır olmayabilir.
        var profile = await db.DoctorProfiles.FirstOrDefaultAsync(p => p.UserId == user.Id, context.CancellationToken);

        return new UserMessage
        {
            Id = user.Id.ToString(),
            UserName = user.UserName ?? string.Empty,
            Email = user.Email ?? string.Empty,
            FullName = user.FullName ?? string.Empty,
            Specialty = profile?.Specialty ?? string.Empty,
            VerificationStatus = profile?.VerificationStatus ?? DoctorVerificationStatus.Pending,
        };
    }
}
