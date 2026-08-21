namespace Marketplace.Email;

/// <summary>E-posta gönderim soyutlaması — CodeGen dışı, elle eklendi (bkz. Identity.Email'deki aynı
/// desen; bu repo paylaşılan bir email kütüphanesi kullanmıyor, her servis kendi kopyasını taşır).</summary>
public interface IEmailSender
{
    Task SendAsync(string toEmail, string subject, string htmlBody, CancellationToken cancellationToken = default);
}
