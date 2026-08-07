"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { marketplaceApi, type MarketplaceCategory, type MarketplaceRequest } from "@/lib/api";
import { auth, useHasToken } from "@/lib/auth";

function currency(n: number) {
  return `${n.toLocaleString("tr-TR")} ₺`;
}

export default function TaleplerimPage() {
  const hasToken = useHasToken();
  const [requests, setRequests] = useState<MarketplaceRequest[]>([]);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const myId = auth.getUserId();
    if (!myId) return;
    setLoading(true);
    try {
      const [reqRes, catRes] = await Promise.all([
        marketplaceApi.listRequests({ pageSize: 200 }),
        marketplaceApi.listCategories({ pageSize: 100 }),
      ]);
      setRequests(reqRes.items.filter((r) => r.requesterId === myId));
      setCategories(catRes.items);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Talepler alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasToken) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta/oturum değişince veri çekme (React'in "Fetching data" deseni)
    void load();
  }, [hasToken, load]);

  const remove = async (id: string) => {
    setBusyId(id);
    try {
      await marketplaceApi.deleteRequest(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kaldırılamadı.");
    } finally {
      setBusyId(null);
    }
  };

  if (!hasToken) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-xl font-bold text-foreground">Taleplerim</h1>
        <p className="text-sm text-muted-foreground">Görüntülemek için giriş yapın.</p>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 sm:px-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Taleplerim</h1>
        <Link href="/talep-ver">
          <Button>+ Yeni Talep Ekle</Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">Henüz talebiniz yok.</p>
      ) : (
        <div className="flex flex-col">
          {requests.map((req) => (
            <div
              key={req.id}
              className="flex items-center justify-between border-t border-border py-3.5 first:border-t-0"
            >
              <div>
                <div className="text-sm font-bold text-foreground">{req.title}</div>
                <div className="text-xs text-muted-foreground">
                  {categories.find((c) => c.id === req.categoryId)?.name ?? "Diğer"}
                  {req.budgetMax ? ` · Bütçe: ${currency(req.budgetMax)}` : ""}
                </div>
              </div>
              <button
                onClick={() => remove(req.id)}
                disabled={busyId === req.id}
                className="text-xs font-semibold text-red-600"
              >
                Kaldır
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
