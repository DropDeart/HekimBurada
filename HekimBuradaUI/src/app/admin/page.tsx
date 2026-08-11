"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { adminApi, gatewayApi, marketplaceApi, type Announcement, type Listing, type VerificationRow } from "@/lib/api";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR");
}

export default function AdminDashboardPage() {
  const [pendingDoctors, setPendingDoctors] = useState<VerificationRow[]>([]);
  // Widget'ta sadece ilk 3 kayıt gösteriliyor ama istatistik kartı gerçek toplamı göstermeli — önceden
  // ikisi de aynı (3'e kırpılmış) diziden okunduğu için 3'ten fazla bekleyen varsa kart hep "3" gösterirdi.
  const [pendingTotal, setPendingTotal] = useState<number | null>(null);
  const [activeListingCount, setActiveListingCount] = useState<number | null>(null);
  const [pendingListings, setPendingListings] = useState<Listing[]>([]);
  const [pendingListingTotal, setPendingListingTotal] = useState<number | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementTotal, setAnnouncementTotal] = useState<number | null>(null);

  useEffect(() => {
    adminApi
      .listVerifications("pending", { pageSize: 3 })
      .then((res) => {
        setPendingTotal(res.totalCount);
        setPendingDoctors(res.items);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Bekleyen doğrulamalar alınamadı."));
    marketplaceApi
      .listListings({ pageSize: 1 })
      .then((r) => setActiveListingCount(r.totalCount))
      .catch((err) => toast.error(err instanceof Error ? err.message : "İlan sayısı alınamadı."));
    marketplaceApi
      .listListings({ pageSize: 3, status: "pending" })
      .then((r) => {
        setPendingListingTotal(r.totalCount);
        setPendingListings(r.items);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Bekleyen ilanlar alınamadı."));
    gatewayApi
      .listAnnouncements({ pageSize: 100 })
      .then((r) => {
        setAnnouncementTotal(r.totalCount);
        setAnnouncements([...r.items].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 3));
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Duyurular alınamadı."));
  }, []);

  const stats = [
    { label: "Bekleyen Doğrulama", value: pendingTotal === null ? "—" : String(pendingTotal) },
    { label: "Bekleyen İlan Onayı", value: pendingListingTotal === null ? "—" : String(pendingListingTotal) },
    { label: "Toplam İlan", value: activeListingCount === null ? "—" : String(activeListingCount) },
    { label: "Duyuru Sayısı", value: announcementTotal === null ? "—" : String(announcementTotal) },
  ];

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-foreground">Ana Sayfa</h1>
      <p className="mb-7 text-sm text-muted-foreground">
        Platform özet durumu ve bekleyen işlemler.
      </p>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-[10px] border border-border bg-white p-4.5">
            <div className="mb-2 text-[13px] text-muted-foreground">{s.label}</div>
            <div className="text-[28px] font-bold text-foreground">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-[10px] border border-border bg-white p-5">
          <h3 className="mb-3.5 text-base font-bold text-foreground">
            Bekleyen Doktor Doğrulamaları
          </h3>
          {pendingDoctors.length === 0 ? (
            <p className="text-xs text-muted-foreground">Bekleyen doğrulama yok.</p>
          ) : (
            pendingDoctors.map((d) => (
              <div key={d.userId} className="border-t border-[#F0F2F3] py-3 first:border-t-0">
                <div className="text-sm font-semibold text-foreground">{d.email}</div>
                <div className="text-xs text-muted-foreground">
                  {d.specialty} · Tescil {d.diplomaNo}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="rounded-[10px] border border-border bg-white p-5">
          <div className="mb-3.5 flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground">Bekleyen İlan Onayları</h3>
            {pendingListingTotal !== null && pendingListingTotal > 0 && (
              <Link href="/admin/urunler" className="text-xs font-semibold text-brand">
                Tümünü gör
              </Link>
            )}
          </div>
          {pendingListings.length === 0 ? (
            <p className="text-xs text-muted-foreground">Bekleyen ilan yok.</p>
          ) : (
            pendingListings.map((l) => (
              <div key={l.id} className="border-t border-[#F0F2F3] py-3 first:border-t-0">
                <div className="text-sm font-semibold text-foreground">{l.title}</div>
                <div className="text-xs text-muted-foreground">{l.city}</div>
              </div>
            ))
          )}
        </div>

        <div className="rounded-[10px] border border-border bg-white p-5">
          <h3 className="mb-3.5 text-base font-bold text-foreground">Duyurular</h3>
          {announcements.length === 0 ? (
            <p className="text-xs text-muted-foreground">Duyuru yok.</p>
          ) : (
            announcements.map((a) => (
              <div key={a.id} className="border-t border-[#F0F2F3] py-3 first:border-t-0">
                <div className="text-[13px] font-semibold text-foreground">{a.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{formatDate(a.publishedAt)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
