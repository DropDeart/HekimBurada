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
///
/// Serilog'un Loki sink'i (bkz. BaseForge.API.AddBaseForgeLogging) her satırı düz metin yerine tüm
/// olayı (Message/MessageTemplate/level/SourceContext/...) taşıyan bir JSON gövdesi olarak yazıyor —
/// bu, Grafana Explore'da okunaklı ama ham haliyle admin paneli için fazla gürültülü. Bu controller
/// o JSON'ı burada, sunucu tarafında çözüp sade bir {timestamp, service, level, message, sourceContext}
/// şekline indirger; BaseForge'un kendisi (ayrı bir NuGet paketi, sürüm basıp 5 servise dağıtmak
/// gerektirir) değiştirilmeden çözülüyor.
/// </summary>
[Authorize]
[Route("api/logs")]
public sealed class LogsController : BaseController
{
    private static readonly string[] KnownServices = ["identity", "marketplace", "messaging", "community", "gateway"];

    /// <summary>Serilog.Sinks.Grafana.Loki'nin ürettiği kısaltılmış seviye adları — frontend'deki
    /// seviye filtresi bu kümeyle sınırlı (bkz. proje kararı: keyfi bir LogQL parçası enjekte edilmesin).</summary>
    private static readonly string[] KnownLevels = ["trace", "debug", "info", "warn", "error", "critical"];

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
    /// "all" ise tüm servisler taranır. <paramref name="level"/> ("all" veya boşsa uygulanmaz) satırın
    /// JSON gövdesinden çözülen seviyeye göre bu uçta filtrelenir. <paramref name="search"/>, LogQL'e
    /// regex olarak eklenmeden önce <see cref="Regex.Escape(string)"/> ile kaçırılır — kullanıcı
    /// girdisinin sorguyu bozması/başka bir seçiciye sızması engellenir.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<LogEntryDto>>> Query(
        [FromQuery] string service = "all",
        [FromQuery] string level = "all",
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
        var levelFilter = KnownLevels.Contains(level) ? level : null;

        var selector = service == "all" || !KnownServices.Contains(service)
            ? "{service=~\".+\"}"
            : $$"""{service="{{service}}"}""";

        var logQl = string.IsNullOrWhiteSpace(search)
            ? selector
            : $"{selector} |~ \"(?i){Regex.Escape(search)}\"";

        // Seviyeye göre filtrelenecekse önce Loki'den daha geniş bir ham küme çekilir (JSON içindeki
        // seviye Loki'nin kendi seçicisinde yok, burada satır satır çözülüp filtreleniyor) —
        // yoksa istenenden azı, hatta hiçbiri "error" gibi seyrek bir seviyeye denk gelmeyebilir.
        var fetchLimit = levelFilter is null ? clampedLimit : Math.Min(2000, clampedLimit * 10);

        var end = DateTimeOffset.UtcNow;
        var start = end.AddMinutes(-clampedMinutes);
        var url = QueryHelpers.AddQueryString($"{_lokiUrl}/loki/api/v1/query_range", new Dictionary<string, string?>
        {
            ["query"] = logQl,
            ["start"] = (start.ToUnixTimeMilliseconds() * 1_000_000).ToString(),
            ["end"] = (end.ToUnixTimeMilliseconds() * 1_000_000).ToString(),
            ["limit"] = fetchLimit.ToString(),
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
        var entries = ParseLokiResponse(body);

        if (levelFilter is not null)
        {
            entries = [.. entries.Where(e => e.Level == levelFilter)];
        }

        return Ok(entries.Count > clampedLimit ? entries[..clampedLimit] : entries);
    }

    /// <summary>Loki'nin ham {"data":{"result":[{"stream":{...},"values":[[ns,"line"],...]}]}} şeklini
    /// frontend için düz, zaman sıralı bir listeye indirger — her satırın kendisi de (Serilog'un Loki
    /// sink'i JSON yazdığından) ayrıca çözülüp Message/level/SourceContext alanlarına ayrıştırılır.</summary>
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
                var timestamp = DateTimeOffset.FromUnixTimeMilliseconds(nsTimestamp / 1_000_000);
                entries.Add(ParseLine(timestamp, serviceLabel, line));
            }
        }

        return [.. entries.OrderByDescending(e => e.Timestamp)];
    }

    /// <summary>Serilog'un Loki sink'inin JSON gövdesini çözer — ayrıştırılamazsa (ör. altyapının
    /// kendi düz metin satırları) satırın tamamı Message olarak, seviyesiz döner.</summary>
    private static LogEntryDto ParseLine(DateTimeOffset timestamp, string service, string line)
    {
        try
        {
            using var doc = JsonDocument.Parse(line);
            var root = doc.RootElement;
            var message = root.TryGetProperty("Message", out var m) ? m.GetString() ?? line : line;
            var lvl = root.TryGetProperty("level", out var l) ? l.GetString() ?? "" : "";
            var sourceContext = root.TryGetProperty("SourceContext", out var sc) ? sc.GetString() : null;
            return new LogEntryDto(timestamp, service, lvl, message, sourceContext);
        }
        catch (JsonException)
        {
            return new LogEntryDto(timestamp, service, "", line, null);
        }
    }
}

/// <summary>Tek bir log satırı — Loki'nin ham stream/values + Serilog'un JSON gövdesi çözülmüş hâli.</summary>
public sealed record LogEntryDto(DateTimeOffset Timestamp, string Service, string Level, string Message, string? SourceContext);
