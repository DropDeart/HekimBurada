"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { PaginationBar } from "@/components/ui/pagination-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { marketplaceApi, type Listing, type ListingStatus } from "@/lib/api";
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
  expired: "bg-muted text-muted-foreground",
};

const STATUS_TABS: { label: string; value: ListingStatus | "all" }[] = [
  { label: "Onay Bekleyen", value: "pending" },
  { label: "Aktif", value: "active" },
  { label: "Reddedilen", value: "rejected" },
  { label: "Tümü", value: "all" },
];

const PAGE_SIZE = 20;

function currency(n: number) {
  return `${n.toLocaleString("tr-TR")} ₺`;
}

export default function AdminUrunlerPage() {
  const [status, setStatus] = useState<ListingStatus | "all">("pending");
  const [listings, setListings] = useState<Listing[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Listing | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Listing | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await marketplaceApi.listListings({
        page,
        pageSize: PAGE_SIZE,
        status: status === "all" ? undefined : status,
      });
      setListings(res.items);
      setTotalCount(res.totalCount);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Liste alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta/sayfa-filtre değişince veri çekme (React'in "Fetching data" deseni)
    void load();
  }, [load]);

  const approve = async (id: string) => {
    setBusyId(id);
    try {
      await marketplaceApi.approveListing(id);
      toast.success("İlan onaylandı.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Onaylanamadı.");
    } finally {
      setBusyId(null);
    }
  };

  const reject = async () => {
    if (!rejectTarget) return;
    setBusyId(rejectTarget.id);
    try {
      await marketplaceApi.rejectListing(rejectTarget.id);
      toast.success("İlan reddedildi.");
      setRejectTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reddedilemedi.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!removeTarget) return;
    setBusyId(removeTarget.id);
    try {
      await marketplaceApi.deleteListing(removeTarget.id);
      setRemoveTarget(null);
      if (listings.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        await load();
      }
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
        Yayınlanan ilanları görüntüleyin, onay bekleyen yeni ilanları onaylayın/reddedin.
      </p>

      <div className="mb-4 flex gap-2">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.value}
            size="sm"
            variant={status === tab.value ? "default" : "outline"}
            onClick={() => {
              setStatus(tab.value);
              setPage(1);
            }}
          >
            {tab.label}
          </Button>
        ))}
      </div>

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
                  <TableCell>
                    <span className={cn("rounded-md px-2 py-1 text-xs font-semibold", STATUS_BADGE[l.status])}>
                      {STATUS_LABEL[l.status]}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {l.status === "pending" && (
                        <>
                          <Button size="sm" disabled={busyId === l.id} onClick={() => approve(l.id)}>
                            Onayla
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={busyId === l.id}
                            onClick={() => setRejectTarget(l)}
                          >
                            Reddet
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/admin/urunler/${l.id}`}>Detay</Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busyId === l.id}
                        onClick={() => setRemoveTarget(l)}
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

      <PaginationBar
        page={page}
        totalPages={Math.ceil(totalCount / PAGE_SIZE)}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        disabled={loading}
      />

      <AlertDialog open={rejectTarget !== null} onOpenChange={(next) => !next && setRejectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>İlan reddedilsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{rejectTarget?.title}&quot; hiç yayına girmeyecek.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={reject}>Reddet</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={removeTarget !== null} onOpenChange={(next) => !next && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>İlan kaldırılsın mı?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{removeTarget?.title}&quot; kalıcı olarak silinecek.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Kaldır</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
