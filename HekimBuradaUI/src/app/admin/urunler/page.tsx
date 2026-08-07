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

const STATUS_LABEL: Record<ListingStatus, string> = {
  draft: "Taslak",
  active: "Aktif",
  sold: "Satıldı",
  removed: "Kaldırıldı",
  expired: "Süresi Doldu",
};

function currency(n: number) {
  return `${n.toLocaleString("tr-TR")} ₺`;
}

export default function AdminUrunlerPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await marketplaceApi.listListings({ pageSize: 200 });
      setListings(res.items);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Liste alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta veri çekme (React'in "Fetching data" deseni)
    void load();
  }, [load]);

  const remove = async (id: string) => {
    setBusyId(id);
    try {
      await marketplaceApi.deleteListing(id);
      setListings((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Silinemedi.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-foreground">Ürün Yönetimi</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        Yayınlanan tüm ilanları görüntüleyin veya kaldırın.
      </p>

      <div className="rounded-lg border border-border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Başlık</TableHead>
              <TableHead>Fiyat</TableHead>
              <TableHead>Şehir</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Yükleniyor…
                </TableCell>
              </TableRow>
            ) : listings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Gösterilecek ilan yok.
                </TableCell>
              </TableRow>
            ) : (
              listings.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <Link href={`/admin/urunler/${l.id}`} className="text-brand hover:underline">
                      {l.title}
                    </Link>
                  </TableCell>
                  <TableCell>{l.price ? currency(l.price) : "—"}</TableCell>
                  <TableCell>{l.city}</TableCell>
                  <TableCell>{STATUS_LABEL[l.status]}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/admin/urunler/${l.id}`}>Detay</Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busyId === l.id}
                        onClick={() => remove(l.id)}
                      >
                        Kaldır
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
