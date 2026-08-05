namespace Identity.Email;

/// <summary>E-posta gönderim soyutlaması. CodeGen dışı, elle eklendi (bkz. plan — OTP doğrulama).</summary>
public interface IEmailSender
{
    Task SendAsync(string toEmail, string subject, string htmlBody, CancellationToken cancellationToken = default);
}
