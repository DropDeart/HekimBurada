using System.Text.Json;
using System.Text.RegularExpressions;
using BaseForge.API.Controllers;
using Gateway.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;

namespace Gateway.Controllers;

/// <summary>
/// Admin panelindeki log görüntüleyici için Grafana Loki'nin sorgu API'sine dar kapsamlı bir proxy —
/// Loki/Grafana'nın kendisi hiç dışarı açılmadan (bkz. proje kararı: sadece SSH tüneliyle erişim),
/// admin paneli zaten var olan JWT girişini kullanarak loglara erişebilsin diye. Sadece SuperAdmin
/// çağırabilir — tüm platformun iç loglarını (hata mesajları, stack trace'ler) açığa çıkardığından
/// düz Admin'e bile kapalı. CodeGen dışı, elle eklendi.
/// </summary>
[Authorize]
[Route("api/logs")]
public sealed class LogsController : BaseController
{
    private static readonly string[] KnownServices = ["identity", "marketplace", "messaging", "community", "gateway"];

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly string _lokiUrl;

    public LogsController(IHttpClientFactory httpClientFactory, IConfiguration configuration)
    {
        _httpClientFactory = httpClientFactory;
        _lokiUrl = configuration["Serilog:LokiUrl"] ?? "http://hekimburada-loki:3100";
    }

    /// <summary>Bilinen servis adları — frontendin servis seçicisini doldurmak için.</summary>
    [HttpGet("services")]
    public IActionResult Services()
    {
        if (!AdminAuth.IsSuperAdmin(User))
        {
            return Forbid();
        }

        return Ok(KnownServices);
    }

    /// <summary>
    /// Son <paramref name="minutes"/> dakikadaki logları döner (en yeni en üstte). <paramref name="service"/>
    /// "all" ise tüm servisler taranır. <paramref name="search"/>, LogQL'e regex olarak eklenmeden önce
    /// <see cref="Regex.Escape(string)"/> ile kaçırılır — kullanıcı girdisinin sorguyu bozması/başka
    /// bir seçiciye sızması engellenir.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<LogEntryDto>>> Query(
        [FromQuery] string service = "all",
        [FromQuery] string? search = null,
        [FromQuery] int minutes = 60,
        [FromQuery] int limit = 300,
        CancellationToken cancellationToken = default)
    {
        if (!AdminAuth.IsSuperAdmin(User))
        {
            return Forbid();
        }

        var clampedMinutes = Math.Clamp(minutes, 1, 24 * 60);
        var clampedLimit = Math.Clamp(limit, 1, 1000);

        var selector = service == "all" || !KnownServices.Contains(service)
            ? "{service=~\".+\"}"
            : $$"""{service="{{service}}"}""";

        var logQl = string.IsNullOrWhiteSpace(search)
            ? selector
            : $"{selector} |~ \"(?i){Regex.Escape(search)}\"";

        var end = DateTimeOffset.UtcNow;
        var start = end.AddMinutes(-clampedMinutes);
        var url = QueryHelpers.AddQueryString($"{_lokiUrl}/loki/api/v1/query_range", new Dictionary<string, string?>
        {
            ["query"] = logQl,
            ["start"] = (start.ToUnixTimeMilliseconds() * 1_000_000).ToString(),
            ["end"] = (end.ToUnixTimeMilliseconds() * 1_000_000).ToString(),
            ["limit"] = clampedLimit.ToString(),
            ["direction"] = "backward",
        });

        var client = _httpClientFactory.CreateClient();
        HttpResponseMessage response;
        try
        {
            response = await client.GetAsync(url, cancellationToken);
        }
        catch (HttpRequestException)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { error = "Loki'ye ulaşılamadı." });
        }

        if (!response.IsSuccessStatusCode)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { error = "Loki sorgusu başarısız." });
        }

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        return Ok(ParseLokiResponse(body));
    }

    /// <summary>Loki'nin ham {"data":{"result":[{"stream":{...},"values":[[ns,"line"],...]}]}} şeklini
    /// frontend için düz, zaman sıralı bir listeye indirger.</summary>
    private static List<LogEntryDto> ParseLokiResponse(string json)
    {
        var entries = new List<LogEntryDto>();
        using var doc = JsonDocument.Parse(json);
        if (!doc.RootElement.TryGetProperty("data", out var data) || !data.TryGetProperty("result", out var result))
        {
            return entries;
        }

        foreach (var stream in result.EnumerateArray())
        {
            var serviceLabel = stream.TryGetProperty("stream", out var streamLabels) && streamLabels.TryGetProperty("service", out var svc)
                ? svc.GetString() ?? "?"
                : "?";

            if (!stream.TryGetProperty("values", out var values))
            {
                continue;
            }

            foreach (var pair in values.EnumerateArray())
            {
                var nsTimestamp = long.Parse(pair[0].GetString()!);
                var line = pair[1].GetString() ?? "";
                entries.Add(new LogEntryDto(DateTimeOffset.FromUnixTimeMilliseconds(nsTimestamp / 1_000_000), serviceLabel, line));
            }
        }

        return [.. entries.OrderByDescending(e => e.Timestamp)];
    }
}

/// <summary>Tek bir log satırı — Loki'nin ham stream/values şeklini frontend için sadeleştirir.</summary>
public sealed record LogEntryDto(DateTimeOffset Timestamp, string Service, string Line);
