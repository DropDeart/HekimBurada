namespace Community.Email;

/// <summary>SMTP bağlantı ayarları (appsettings "Smtp" bölümü) — CodeGen dışı, elle eklendi.</summary>
public sealed class SmtpOptions
{
    public const string SectionName = "Smtp";
    public string Host { get; set; } = "localhost";
    public int Port { get; set; } = 1025;
    public string? Username { get; set; }
    public string? Password { get; set; }
    public bool UseSsl { get; set; }
    public string FromAddress { get; set; } = "no-reply@hekimburada.com";
    public string FromName { get; set; } = "HekimBurada";
}
