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

    /// <summary>Frontend'in kullandığı kısaltılmış, kanonik seviye adları — LogQL'e gönderilecek keyfi
    /// metin bu kümeyle sınırlı (bkz. proje kararı: enjeksiyon riski olmasın). Serilog'un olayları AYNI
    /// çalıştırma içinde bile tutarsız yazdığı gözlemlendi (bazı olaylarda "info", bazılarında "warning"/
    /// "information"/"fatal") — bu yüzden her kanonik değer LogQL'e regex OLARAK, hem kısa hem uzun
    /// biçimi kapsayacak şekilde gönderiliyor (bkz. <see cref="LevelPattern"/>).</summary>
    private static readonly string[] KnownLevels = ["trace", "debug", "info", "warn", "error", "critical"];

    /// <summary>Her kanonik seviyenin LogQL'de eşleşmesi gereken ham değer(ler)i — Serilog'un aynı
    /// seviyeyi bazen kısa (info/warn) bazen uzun (information/warning/fatal) yazması yüzünden.</summary>
    private static string LevelPattern(string canonical) => canonical switch
    {
        "trace" => "(?i)^(trace|verbose)$",
        "debug" => "(?i)^debug$",
        "info" => "(?i)^(info|information)$",
        "warn" => "(?i)^(warn|warning)$",
        "error" => "(?i)^error$",
        "critical" => "(?i)^(critical|fatal)$",
        _ => "(?i)^$",
    };

    /// <summary>Loki'den dönen ham seviye metnini (info/information/warn/warning/error/fatal/...) frontend'in
    /// tanıdığı kanonik kısa forma indirger — hem filtre hem renkli rozet bu yüzden hep tutarlı çalışır.</summary>
    private static string CanonicalizeLevel(string raw) => raw.ToLowerInvariant() switch
    {
        "trace" or "verbose" => "trace",
        "debug" => "debug",
        "info" or "information" => "info",
        "warn" or "warning" => "warn",
        "error" => "error",
        "critical" or "fatal" => "critical",
        _ => raw.ToLowerInvariant(),
    };

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
    /// "all" ise tüm servisler taranır. <paramref name="level"/> ("all" veya boşsa uygulanmaz) Loki'nin
    /// kendi LogQL'inde <c>| json | level="..."</c> aşamasıyla filtrelenir — ilk denemede bunu bu uçta
    /// (ham kümeyi çekip C# tarafında eleyerek) yapmıştık, ama "son N satır" zaten INFO gürültüsüyle
    /// dolup taştığından eski/seyrek bir "error" seviyesi o pencerenin dışında kalıp hiç dönmüyordu —
    /// LogQL'in kendisine bırakınca bu sorun kalmıyor. <paramref name="search"/>, LogQL'e regex olarak
    /// eklenmeden önce <see cref="Regex.Escape(string)"/> ile kaçırılır — kullanıcı girdisinin sorguyu
    /// bozması/başka bir seçiciye sızması engellenir.
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

        var selector = service == "all" || !KnownServices.Contains(service)
            ? "{service=~\".+\"}"
            : $$"""{service="{{service}}"}""";

        var logQl = selector;
        if (!string.IsNullOrWhiteSpace(search))
        {
            logQl += $" |~ \"(?i){Regex.Escape(search)}\"";
        }

        if (KnownLevels.Contains(level))
        {
            // level zaten KnownLevels'a karşı denetlendiğinden serbest metin değil — düz interpolasyon güvenli.
            logQl += $" | json | level=~`{LevelPattern(level)}`";
        }

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
            var lvl = root.TryGetProperty("level", out var l) ? CanonicalizeLevel(l.GetString() ?? "") : "";
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
