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
    /// Doğrulama kodu e-postasının HTML gövdesi. Tasarım tarafından verilen bir örnek şablondan
    /// birebir uyarlandı (logo görseli Gateway'in site-settings uploads'ından, "KODU GİR" butonu
    /// kasıtlı olarak çıkarıldı — kullanıcı kodu doğrudan doğrulama ekranına giriyor, e-postadan
    /// tıklanacak bir link yok). Eposta istemcileri için tablo tabanlı, eski usül HTML.
    /// </summary>
    private static string BuildOtpEmailHtml(string greeting, string code, int lifetimeMinutes)
    {
        var formattedCode = code.Length == 6 ? $"{code[..3]} {code[3..]}" : code;
        const string logoUrl = "https://gateway.hekimburada.com/uploads/site/b2da57bafaef4f749ba4a1d45a28e2bd.png";

        return $"""
            <!DOCTYPE html>
            <html>
            <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <meta name="color-scheme" content="light dark">
            </head>
            <body style="margin:0; padding:0; background:#e9e8e6;">
            <div style="background:#e9e8e6; padding:40px 16px; font-family:Arial,Helvetica,sans-serif;">
            <div style="display:none; font-size:1px; color:#e9e8e6; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">Doğrulama kodunuz hazır. Kod {lifetimeMinutes} dakika boyunca geçerlidir.</div>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="600" style="width:600px; max-width:600px; margin:0 auto; background:#ffffff; border-collapse:collapse;">
            <tr>
            <td width="600" style="padding:32px 40px 24px 40px; border-bottom:2px solid #201e1d;">
            <img src="{logoUrl}" alt="HekimBurada" width="185" height="44" style="display:block; width:185px; height:44px;">
            </td>
            </tr>
            <tr>
            <td width="600" style="padding:40px 40px 8px 40px; font-family:Arial,Helvetica,sans-serif; font-size:11px; line-height:14px; font-weight:bold; letter-spacing:2.5px; color:#6b6764; text-transform:uppercase;">HESAP DOĞRULAMA</td>
            </tr>
            <tr>
            <td width="600" style="padding:0 40px 16px 40px; font-family:Arial,Helvetica,sans-serif; font-size:30px; line-height:36px; font-weight:bold; letter-spacing:-0.6px; color:#201e1d;">Doğrulama kodunuz</td>
            </tr>
            <tr>
            <td width="600" style="padding:0 40px 32px 40px; font-family:Arial,Helvetica,sans-serif; font-size:16px; line-height:26px; color:#4a4644;">{greeting}<br>HekimBurada hesabınızı doğrulamak için aşağıdaki 6 haneli kodu ilgili alana girin.</td>
            </tr>
            <tr>
            <td width="600" style="padding:0 40px 0 40px;">
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
            <tr>
            <td width="600" style="padding:32px 40px 0 40px;"><div style="height:2px; background:#201e1d; font-size:0; line-height:0;">&nbsp;</div></td>
            </tr>
            <tr>
            <td width="600" style="padding:20px 40px 36px 40px; font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:20px; color:#8a8683;">HekimBurada Sağlık Teknolojileri A.Ş.<br><a href="https://hekimburada.com/yardim" style="color:#1f7a56; text-decoration:underline;">Yardım merkezi</a> &nbsp;·&nbsp; <a href="https://hekimburada.com/gizlilik" style="color:#1f7a56; text-decoration:underline;">Gizlilik</a> &nbsp;·&nbsp; <a href="https://hekimburada.com/eposta-tercihleri" style="color:#1f7a56; text-decoration:underline;">E-posta tercihleri</a></td>
            </tr>
            </table>
            </div>
            </body>
            </html>
            """;
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
