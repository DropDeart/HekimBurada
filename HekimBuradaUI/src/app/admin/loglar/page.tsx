"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { logsApi, type LogEntry } from "@/lib/api";
import { cn } from "@/lib/utils";

const TIME_RANGES = [
  { value: "15", label: "Son 15 dakika" },
  { value: "60", label: "Son 1 saat" },
  { value: "360", label: "Son 6 saat" },
  { value: "1440", label: "Son 24 saat" },
];

/** Serilog'un konsol formatındaki "[HH:mm:ss WRN]"/"warn:"/"error:" gibi işaretlere göre kaba bir
 * seviye tahmini — Loki seviyeyi ayrı bir etiket olarak tutmuyor, satırın kendisinden çıkarılıyor. */
function levelOf(line: string): "error" | "warn" | "info" {
  if (/\b(ERR|error|Exception|Hata)\b/.test(line)) return "error";
  if (/\b(WRN|warn)\b/i.test(line)) return "warn";
  return "info";
}

const LEVEL_STYLE: Record<string, string> = {
  error: "text-red-400",
  warn: "text-amber-400",
  info: "text-slate-300",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function LoglarPage() {
  const [services, setServices] = useState<string[]>([]);
  const [service, setService] = useState("all");
  const [minutes, setMinutes] = useState("60");
  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsApi
      .listServices()
      .then(setServices)
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const items = await logsApi.query({
        service,
        search: search.trim() || undefined,
        minutes: Number(minutes),
        limit: 500,
      });
      setEntries(items);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Loglar alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [service, minutes, search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta/filtre değişince veri çekme (React'in "Fetching data" deseni)
    void load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, load]);

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Sistem Logları</h1>
        <p className="text-sm text-muted-foreground">
          Servislerin canlı loglarını Grafana Loki üzerinden görüntüler. Sadece SuperAdmin erişebilir.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <Select value={service} onValueChange={setService}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm servisler</SelectItem>
            {services.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={minutes} onValueChange={setMinutes}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="Log içinde ara…"
          className="max-w-xs"
        />

        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={cn("mr-1.5", loading && "animate-spin")} />
          Yenile
        </Button>

        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
          Otomatik yenile (5sn)
        </label>

        <span className="ml-auto text-xs text-muted-foreground">{entries.length} satır</span>
      </div>

      <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-[#0b0f11] p-3 font-mono text-[12.5px] leading-relaxed">
        {loading && entries.length === 0 ? (
          <p className="text-slate-500">Yükleniyor…</p>
        ) : entries.length === 0 ? (
          <p className="text-slate-500">Bu filtrelerle gösterilecek log yok.</p>
        ) : (
          entries.map((e, i) => (
            <div key={i} className="flex gap-3 border-b border-white/5 py-1">
              <span className="shrink-0 text-slate-500">{formatTime(e.timestamp)}</span>
              <span className="w-[90px] shrink-0 truncate text-emerald-400">{e.service}</span>
              <span className={cn("min-w-0 flex-1 break-all whitespace-pre-wrap", LEVEL_STYLE[levelOf(e.line)])}>
                {e.line}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
