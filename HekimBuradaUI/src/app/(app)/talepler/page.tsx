"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { marketplaceApi, type MarketplaceCategory, type MarketplaceRequest } from "@/lib/api";
import { useHasToken } from "@/lib/auth";

function currency(n: number) {
  return `${n.toLocaleString("tr-TR")} ₺`;
}

export default function TaleplerPage() {
  const hasToken = useHasToken();
  const [requests, setRequests] = useState<MarketplaceRequest[]>([]);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta/oturum değişince veri çekme (React'in "Fetching data" deseni)
      setLoading(false);
      return;
    }
    Promise.all([
      marketplaceApi.listRequests({ pageSize: 100 }),
      marketplaceApi.listCategories({ pageSize: 100 }),
    ])
      .then(([reqRes, catRes]) => {
        setRequests(reqRes.items);
        setCategories(catRes.items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hasToken]);

  if (!hasToken) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-xl font-bold text-foreground">Talepler</h1>
        <p className="text-sm text-muted-foreground">Talepleri görmek için giriş yapın.</p>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 sm:px-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Talepler</h1>
          <p className="text-sm text-muted-foreground">
            Meslektaşlarınızın aradığı ürün ve fırsatlar.
          </p>
        </div>
        <Link href="/talep-ver">
          <Button>+ Talep Oluştur</Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">Henüz talep yok.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {requests.map((req) => (
            <Link
              key={req.id}
              href={`/talepler/${req.id}`}
              className="block rounded-[10px] border border-border bg-[#FAFBFB] p-4 hover:border-brand"
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span className="inline-block rounded-md bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand">
                  {categories.find((c) => c.id === req.categoryId)?.name ?? "Diğer"}
                </span>
                {req.status === "closed" && (
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                    Kapatıldı
                  </span>
                )}
              </div>
              <div className="mb-1.5 text-sm font-bold text-foreground">{req.title}</div>
              <p className="mb-1.5 text-xs text-muted-foreground">{req.description}</p>
              <div className="text-xs font-semibold text-foreground">
                {req.budgetMax ? `Bütçe: ${currency(req.budgetMax)}` : "Bütçe belirtilmedi"}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
