"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { marketplaceApi, type Listing, type ListingStatus } from "@/lib/api";
import { auth, useHasToken } from "@/lib/auth";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<ListingStatus, string> = {
  draft: "Taslak",
  pending: "Onay Bekliyor",
  active: "Aktif",
  rejected: "Reddedildi",
  sold: "Satıldı",
  removed: "Kaldırıldı",
  expired: "Süresi Doldu",
};

const STATUS_BADGE: Record<ListingStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-amber-50 text-amber-700",
  active: "bg-brand-soft text-brand",
  rejected: "bg-red-50 text-red-700",
  sold: "bg-blue-50 text-blue-700",
  removed: "bg-red-50 text-red-700",
  expired: "bg-amber-50 text-amber-700",
};

function currency(n: number) {
  return `${n.toLocaleString("tr-TR")} ₺`;
}

export default function IlanlarimPage() {
  const hasToken = useHasToken();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const myId = auth.getUserId();
    if (!myId) return;
    setLoading(true);
    try {
      const res = await marketplaceApi.listListings({ pageSize: 200 });
      setListings(res.items.filter((l) => l.sellerId === myId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İlanlar alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasToken) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta/oturum değişince veri çekme (React'in "Fetching data" deseni)
    void load();
  }, [hasToken, load]);

  const renew = async (id: string) => {
    setBusyId(id);
    try {
      await marketplaceApi.renewListing(id);
      toast.success("İlan yenilendi.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Yenilenemedi.");
    } finally {
      setBusyId(null);
    }
  };

  const republish = async (id: string) => {
    setBusyId(id);
    try {
      await marketplaceApi.republishListing(id);
      toast.success("İlan yeniden yayınlandı.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Yeniden yayınlanamadı.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    setBusyId(id);
    try {
      await marketplaceApi.deleteListing(id);
      toast.success("İlan silindi.");
      setListings((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Silinemedi.");
    } finally {
      setBusyId(null);
    }
  };

  if (!hasToken) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-xl font-bold text-foreground">İlanlarım</h1>
        <p className="text-sm text-muted-foreground">Görüntülemek için giriş yapın.</p>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 sm:px-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">İlanlarım</h1>
        <Link href="/ilan-ver">
          <Button>+ İlan Ver</Button>
        </Link>
      </div>

      <div className="rounded-lg border border-border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Başlık</TableHead>
              <TableHead>Fiyat</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  Yükleniyor…
                </TableCell>
              </TableRow>
            ) : listings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  Henüz ilanınız yok.
                </TableCell>
              </TableRow>
            ) : (
              listings.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <Link href={`/ilanlar/${l.id}`} className="font-medium text-foreground hover:text-brand">
                      {l.title}
                    </Link>
                  </TableCell>
                  <TableCell>{l.price ? currency(l.price) : "—"}</TableCell>
                  <TableCell>
                    <span className={cn("rounded-md px-2 py-1 text-xs font-semibold", STATUS_BADGE[l.status])}>
                      {STATUS_LABEL[l.status]}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {(l.status === "active" || l.status === "expired") && (
                        <Button size="sm" variant="outline" disabled={busyId === l.id} onClick={() => renew(l.id)}>
                          Yenile
                        </Button>
                      )}
                      {(l.status === "sold" || l.status === "removed") && (
                        <Button size="sm" variant="outline" disabled={busyId === l.id} onClick={() => republish(l.id)}>
                          Yeniden Yayınla
                        </Button>
                      )}
                      <Button size="sm" variant="destructive" disabled={busyId === l.id} onClick={() => remove(l.id)}>
                        Sil
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
