namespace Community.Email;

/// <summary>
/// Tüm HekimBurada bildirim e-postalarının ortak kabuğu (logo/header, alt bilgi/footer) — CodeGen
/// dışı, elle eklendi. Tasarım kaynağı: EmailOtpService.BuildOtpEmailHtml (doğrulama kodu e-postası,
/// tasarım tarafından verilen örnek şablondan uyarlanmıştı) — bkz. proje kararı: aynı görsel kimlik
/// her e-postada tekrarlanmalı, yalnızca etiket/başlık/gövde/buton (içerik) değişmeli. Her servis bu
/// dosyanın kendi kopyasını taşır (bu repo paylaşılan bir email kütüphanesi kullanmıyor).
/// </summary>
public static class EmailTemplate
{
    private const string LogoUrl = "https://gateway.hekimburada.com/uploads/site/b2da57bafaef4f749ba4a1d45a28e2bd.png";

    /// <param name="label">Küçük, büyük harfli üst etiket (ör. "YENİ TEKLİF", "İLAN ONAYI").</param>
    /// <param name="title">Büyük başlık (ör. "İlanınıza yeni bir teklif geldi").</param>
    /// <param name="bodyHtml">Ana gövde metni — düz metin/basit satır içi HTML (kalın vb.), TEK bir
    /// &lt;td&gt; içine yerleştirilir.</param>
    /// <param name="ctaText">Verilirse bir buton gösterilir (ör. "İlanı Görüntüle").</param>
    /// <param name="ctaUrl">Buton hedefi — mutlak URL olmalı (ör. https://hekimburada.com/ilanlar/{id}).</param>
    /// <param name="extraRowsHtml">Kod kutusu gibi kendi &lt;tr&gt;&lt;td&gt;...&lt;/td&gt;&lt;/tr&gt;
    /// yapısını taşıyan, bodyHtml'den sonra CTA'dan önce eklenecek tam satır(lar) — bkz. EmailOtpService.</param>
    public static string Build(string label, string title, string bodyHtml, string? ctaText = null, string? ctaUrl = null, string? extraRowsHtml = null)
    {
        var ctaBlock = ctaText is not null && ctaUrl is not null
            ? $"""
                <tr>
                <td width="600" style="padding:8px 40px 0 40px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                <td style="border-radius:6px; background:#2FBD82;">
                <a href="{ctaUrl}" style="display:inline-block; padding:14px 28px; font-family:Arial,Helvetica,sans-serif; font-size:14px; font-weight:bold; color:#0f2c21; text-decoration:none;">{ctaText}</a>
                </td>
                </tr>
                </table>
                </td>
                </tr>
                """
            : string.Empty;

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
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="600" style="width:600px; max-width:600px; margin:0 auto; background:#ffffff; border-collapse:collapse;">
            <tr>
            <td width="600" style="padding:32px 40px 24px 40px; border-bottom:2px solid #201e1d;">
            <img src="{LogoUrl}" alt="HekimBurada" width="185" height="44" style="display:block; width:185px; height:44px;">
            </td>
            </tr>
            <tr>
            <td width="600" style="padding:40px 40px 8px 40px; font-family:Arial,Helvetica,sans-serif; font-size:11px; line-height:14px; font-weight:bold; letter-spacing:2.5px; color:#6b6764; text-transform:uppercase;">{label}</td>
            </tr>
            <tr>
            <td width="600" style="padding:0 40px 16px 40px; font-family:Arial,Helvetica,sans-serif; font-size:30px; line-height:36px; font-weight:bold; letter-spacing:-0.6px; color:#201e1d;">{title}</td>
            </tr>
            <tr>
            <td width="600" style="padding:0 40px 8px 40px; font-family:Arial,Helvetica,sans-serif; font-size:16px; line-height:26px; color:#4a4644;">{bodyHtml}</td>
            </tr>
            {extraRowsHtml}
            {ctaBlock}
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
}
