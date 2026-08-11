using BaseForge.API.Controllers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Gateway.Controllers;

/// <summary>Genel görsel yükleme ucu — dosyayı wwwroot/uploads altına fiziksel olarak kaydeder (URL/base64 değil).</summary>
[Authorize]
[Route("api/media")]
public sealed class MediaController : BaseController
{
    /// <summary>image/x-icon ve image/vnd.microsoft.icon ikisi de .ico için kullanılıyor — tarayıcıya/işletim
    /// sistemine göre değişiyor (favicon yüklemesi için gerekli, bkz. admin Ayarlar Genel sekmesi).</summary>
    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/png", "image/webp", "image/gif", "image/x-icon", "image/vnd.microsoft.icon",
    };

    private const long MaxFileBytes = 5 * 1024 * 1024; // 5 MB

    private readonly IWebHostEnvironment _env;

    public MediaController(IWebHostEnvironment env) => _env = env;

    /// <summary>Bir görseli yükler ve genel erişilebilir URL'ini döndürür.</summary>
    [HttpPost]
    [RequestSizeLimit(MaxFileBytes + 4096)]
    public async Task<ActionResult<MediaUploadResponse>> Upload(IFormFile? file, [FromForm] string? category, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(new { error = "Dosya gerekli." });
        }

        if (file.Length > MaxFileBytes)
        {
            return BadRequest(new { error = "Dosya en fazla 5 MB olabilir." });
        }

        // Windows'ta .ico dosyaları için content-type tarayıcıya göre değişiyor, bazen hiç ayarlanmıyor
        // (application/octet-stream) — bu yüzden content-type belirsizse dosya adı uzantısına da bakıyoruz.
        var isIcoByExtension = file.FileName.EndsWith(".ico", StringComparison.OrdinalIgnoreCase);
        if (!AllowedContentTypes.Contains(file.ContentType) && !isIcoByExtension)
        {
            return BadRequest(new { error = "Sadece JPEG, PNG, WEBP, GIF veya ICO yükleyebilirsiniz." });
        }

        var extension = file.ContentType switch
        {
            "image/jpeg" => ".jpg",
            "image/png" => ".png",
            "image/webp" => ".webp",
            "image/gif" => ".gif",
            "image/x-icon" or "image/vnd.microsoft.icon" => ".ico",
            _ when isIcoByExtension => ".ico",
            _ => ".bin",
        };

        var safeCategory = string.IsNullOrWhiteSpace(category) || category.Any(c => !char.IsLetterOrDigit(c) && c != '-')
            ? "misc"
            : category;

        var uploadsDir = Path.Combine(_env.WebRootPath, "uploads", safeCategory);
        Directory.CreateDirectory(uploadsDir);

        var fileName = $"{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(uploadsDir, fileName);

        await using (var stream = System.IO.File.Create(filePath))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        return Ok(new MediaUploadResponse($"/uploads/{safeCategory}/{fileName}"));
    }
}

/// <summary>Yüklenen görselin genel erişilebilir yolu.</summary>
public sealed record MediaUploadResponse(string Url);
