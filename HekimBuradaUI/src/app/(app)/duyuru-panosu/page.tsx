"use client";

import { useEffect, useState } from "react";
import { GATEWAY_URL, gatewayApi, type Announcement } from "@/lib/api";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR");
}

export default function DuyuruPanosuPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    gatewayApi
      .listAnnouncements({ pageSize: 100 })
      .then((r) => setAnnouncements([...r.items].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="mb-1 text-2xl font-bold text-foreground">Duyuru Panosu</h1>
      <p className="mb-8 text-sm text-muted-foreground">Platformdaki son gelişmeler.</p>
      <div className="flex flex-col">
        {loading ? (
          <p className="text-sm text-muted-foreground">Yükleniyor…</p>
        ) : announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz duyuru yok.</p>
        ) : (
          announcements.map((a) => (
            <div key={a.id} className="border-t border-border py-4 first:border-t-0">
              {a.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- admin panelden yüklenen keyfi harici görsel
                <img
                  src={`${GATEWAY_URL}${a.imageUrl}`}
                  alt={a.title}
                  className="mb-3 h-[180px] w-full rounded-lg object-cover"
                />
              )}
              <div className="text-sm font-semibold text-foreground">{a.title}</div>
              <div className="text-xs text-muted-foreground">{formatDate(a.publishedAt)}</div>
              <p className="mt-2 text-sm text-foreground">{a.body}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
