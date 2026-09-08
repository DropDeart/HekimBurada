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
        var html = BuildOtpEmailHtml(greeting, code, (int)CodeLifetime.TotalMinutes);
        await _emailSender.SendAsync(user.Email, "HekimBurada — E-posta Doğrulama Kodu", html, cancellationToken);
    }

    /// <summary>
    /// Doğrulama kodu e-postasının HTML gövdesi — ortak EmailTemplate kabuğunu kullanır (bkz. proje
    /// kararı: aynı görsel kimlik her e-postada). Kod kutusu OTP'ye özgü olduğundan gövde içeriği
    /// (bodyHtml) olarak doğrudan gömülür; "KODU GİR" butonu kasıtlı olarak yok — kullanıcı kodu
    /// doğrudan doğrulama ekranına giriyor, e-postadan tıklanacak bir link yok.
    /// </summary>
    private static string BuildOtpEmailHtml(string greeting, string code, int lifetimeMinutes)
    {
        var formattedCode = code.Length == 6 ? $"{code[..3]} {code[3..]}" : code;

        var bodyHtml = $"{greeting}<br>HekimBurada hesabınızı doğrulamak için aşağıdaki 6 haneli kodu ilgili alana girin.";

        var extraRowsHtml = $"""
            <tr>
            <td width="600" style="padding:8px 40px 0 40px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse; border:2px solid #201e1d;">
            <tr>
            <td width="516" style="padding:28px 32px 24px 32px; background:#f3f2f2; font-family:'Courier New',Courier,monospace; font-size:44px; line-height:48px; font-weight:bold; letter-spacing:12px; color:#201e1d;">{formattedCode}</td>
            </tr>
            <tr>
            <td width="516" style="padding:12px 32px 14px 32px; background:#2FBD82; font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:16px; font-weight:bold; letter-spacing:2px; color:#0f2c21;">{lifetimeMinutes} DAKİKA GEÇERLİ</td>
            </tr>
            </table>
            </td>
            </tr>
            <tr>
            <td width="600" style="padding:32px 40px 0 40px; font-family:Arial,Helvetica,sans-serif; font-size:14px; line-height:22px; color:#6b6764;">Bu isteği siz yapmadıysanız kodu kimseyle paylaşmayın ve bu e-postayı yok sayın. HekimBurada ekibi sizden asla doğrulama kodu istemez.</td>
            </tr>
            """;

        return EmailTemplate.Build("HESAP DOĞRULAMA", "Doğrulama kodunuz", bodyHtml, extraRowsHtml: extraRowsHtml);
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
