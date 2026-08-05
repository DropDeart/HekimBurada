using System.Security.Cryptography;
using System.Text;
using Identity.Data;
using Identity.Entities;
using Microsoft.EntityFrameworkCore;

namespace Identity.Email;

/// <summary>
/// Kayıt sonrası e-posta doğrulama kodlarının üretimi/gönderimi/doğrulanması. CodeGen dışı, elle
/// eklendi. Bir kullanıcı için her zaman en son üretilen (henüz tüketilmemiş) kod geçerlidir.
/// </summary>
public sealed class EmailOtpService
{
    private static readonly TimeSpan CodeLifetime = TimeSpan.FromMinutes(5);
    private const int MaxFailedAttempts = 5;

    private readonly IdentityServiceDbContext _db;
    private readonly IEmailSender _emailSender;

    public EmailOtpService(IdentityServiceDbContext db, IEmailSender emailSender)
    {
        _db = db;
        _emailSender = emailSender;
    }

    public async Task IssueAndSendAsync(ApplicationUser user, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(user);
        if (string.IsNullOrWhiteSpace(user.Email))
        {
            throw new InvalidOperationException("Kullanıcının e-posta adresi yok.");
        }

        var code = Random.Shared.Next(0, 1_000_000).ToString("D6");
        _db.EmailOtps.Add(new EmailOtp
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            CodeHash = Hash(code),
            ExpiresAt = DateTimeOffset.UtcNow.Add(CodeLifetime),
        });
        await _db.SaveChangesAsync(cancellationToken);

        var greeting = string.IsNullOrWhiteSpace(user.FullName) ? "Merhaba," : $"Merhaba {user.FullName},";
        var html = $"""
            <p>{greeting}</p>
            <p>HekimBurada hesabınızı doğrulamak için aşağıdaki kodu kullanın:</p>
            <p style="font-size:28px;font-weight:700;letter-spacing:4px;">{code}</p>
            <p>Bu kod 5 dakika geçerlidir.</p>
            """;
        await _emailSender.SendAsync(user.Email, "HekimBurada — E-posta Doğrulama Kodu", html, cancellationToken);
    }

    public async Task<EmailOtpVerifyResult> VerifyAsync(Guid userId, string code, CancellationToken cancellationToken)
    {
        var otp = await _db.EmailOtps
            .Where(o => o.UserId == userId && o.ConsumedAt == null)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (otp is null)
        {
            return EmailOtpVerifyResult.NotFound;
        }

        if (otp.FailedAttempts >= MaxFailedAttempts)
        {
            return EmailOtpVerifyResult.TooManyAttempts;
        }

        if (otp.ExpiresAt < DateTimeOffset.UtcNow)
        {
            return EmailOtpVerifyResult.Expired;
        }

        if (!string.Equals(otp.CodeHash, Hash(code), StringComparison.Ordinal))
        {
            otp.FailedAttempts++;
            await _db.SaveChangesAsync(cancellationToken);
            return EmailOtpVerifyResult.Invalid;
        }

        otp.ConsumedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return EmailOtpVerifyResult.Success;
    }

    private static string Hash(string code) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(code)));
}

public enum EmailOtpVerifyResult
{
    Success,
    Invalid,
    Expired,
    TooManyAttempts,
    NotFound,
}
