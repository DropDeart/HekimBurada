"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
import {
  identityApi,
  marketplaceApi,
  type Listing,
  type ListingStatus,
  type MarketplaceCategory,
  type UserLookupRow,
} from "@/lib/api";

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

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("tr-TR");
}

export default function AdminUrunDetayPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const listingId = params.id;

  const [listing, setListing] = useState<Listing | null>(null);
  const [category, setCategory] = useState<MarketplaceCategory | null>(null);
  const [seller, setSeller] = useState<UserLookupRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const l = await marketplaceApi.getListing(listingId);
      setListing(l);
      const [cats, users] = await Promise.all([
        marketplaceApi.listCategories({ pageSize: 100 }),
        identityApi.lookupUsers([l.sellerId]),
      ]);
      setCategory(cats.items.find((c) => c.id === l.categoryId) ?? null);
      setSeller(users[0] ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İlan yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta veri çekme (React'in "Fetching data" deseni)
    void load();
  }, [load]);

  const remove = async () => {
    setRemoving(true);
    try {
      await marketplaceApi.deleteListing(listingId);
      toast.success("İlan kaldırıldı.");
      router.push("/admin/urunler");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Silinemedi.");
      setRemoving(false);
    }
  };

  const images: string[] = (() => {
    try {
      const parsed = JSON.parse(listing?.images ?? "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  if (loading) {
    return <p className="text-sm text-muted-foreground">Yükleniyor…</p>;
  }

  if (!listing) {
    return (
      <div>
        <Link href="/admin/urunler" className="text-sm text-brand">
          ← Ürün Yönetimi&apos;ne dön
        </Link>
        <p className="mt-4 text-sm text-muted-foreground">İlan bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin/urunler" className="text-sm text-brand">
          ← Ürün Yönetimi&apos;ne dön
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">{listing.title}</h1>
          <p className="text-sm text-muted-foreground">{category?.name ?? "Kategori bulunamadı"}</p>
        </div>
        <Button variant="destructive" disabled={removing} onClick={() => setConfirmOpen(true)}>
          {removing ? "Kaldırılıyor…" : "İlanı Kaldır"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-foreground">Görseller</h2>
          <div className="flex h-[220px] items-center justify-center rounded-md bg-[repeating-linear-gradient(135deg,#EEF1F2,#EEF1F2_14px,#E4E8EA_14px,#E4E8EA_28px)] font-mono text-xs text-[#9AA1A5]">
            {images.length > 0 ? `${images.length} görsel` : "GÖRSEL YOK"}
          </div>

          <h2 className="mb-3 mt-5 text-sm font-bold text-foreground">Açıklama</h2>
          <p className="text-sm leading-relaxed text-[#4A5053]">{listing.description || "—"}</p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border bg-white p-5">
            <h2 className="mb-3 text-sm font-bold text-foreground">İlan Bilgileri</h2>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Durum</dt>
              <dd className="text-foreground">{STATUS_LABEL[listing.status]}</dd>

              <dt className="text-muted-foreground">Fiyat</dt>
              <dd className="text-foreground">{listing.price ? currency(listing.price) : "Belirtilmedi"}</dd>

              <dt className="text-muted-foreground">Orijinal Fiyat</dt>
              <dd className="text-foreground">
                {listing.originalPrice ? currency(listing.originalPrice) : "—"}
              </dd>

              <dt className="text-muted-foreground">Durum (Kondisyon)</dt>
              <dd className="text-foreground">{listing.condition || "—"}</dd>

              <dt className="text-muted-foreground">Ödeme Yöntemi</dt>
              <dd className="text-foreground">{listing.paymentMethod || "—"}</dd>

              <dt className="text-muted-foreground">Şehir</dt>
              <dd className="text-foreground">{listing.city || "—"}</dd>

              <dt className="text-muted-foreground">Görüntülenme</dt>
              <dd className="text-foreground">{listing.viewCount}</dd>

              <dt className="text-muted-foreground">Yayın Tarihi</dt>
              <dd className="text-foreground">{formatDate(listing.publishedAt)}</dd>

              <dt className="text-muted-foreground">Bitiş Tarihi</dt>
              <dd className="text-foreground">{formatDate(listing.expiresAt)}</dd>

              <dt className="text-muted-foreground">Yenileme Sayısı</dt>
              <dd className="text-foreground">{listing.renewCount}</dd>
            </dl>
          </div>

          <div className="rounded-lg border border-border bg-white p-5">
            <h2 className="mb-3 text-sm font-bold text-foreground">Satıcı</h2>
            {seller ? (
              <div className="text-sm">
                <div className="font-semibold text-foreground">{seller.fullName ?? "—"}</div>
                <div className="text-muted-foreground">{seller.email}</div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Satıcı bulunamadı.</p>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>İlan kaldırılsın mı?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{listing.title}&quot; kaldırılacak. Bu işlem geri alınamaz.
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
