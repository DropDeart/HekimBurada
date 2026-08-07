"use client";

import { useEffect, useState } from "react";
import { adminApi, marketplaceApi, type VerificationRow } from "@/lib/api";
import { ANNOUNCEMENTS } from "@/lib/staticContent";

export default function AdminDashboardPage() {
  const [pendingDoctors, setPendingDoctors] = useState<VerificationRow[]>([]);
  const [activeListingCount, setActiveListingCount] = useState<number | null>(null);

  useEffect(() => {
    adminApi
      .listVerifications("pending")
      .then((rows) => setPendingDoctors(rows.slice(0, 3)))
      .catch(() => {});
    marketplaceApi
      .listListings({ pageSize: 1 })
      .then((r) => setActiveListingCount(r.totalCount))
      .catch(() => {});
  }, []);

  const stats = [
    { label: "Bekleyen Doğrulama", value: String(pendingDoctors.length) },
    { label: "Toplam İlan", value: activeListingCount === null ? "—" : String(activeListingCount) },
    { label: "Duyuru Sayısı", value: String(ANNOUNCEMENTS.length) },
  ];

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-foreground">Ana Sayfa</h1>
      <p className="mb-7 text-sm text-muted-foreground">
        Platform özet durumu ve bekleyen işlemler.
      </p>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-[10px] border border-border bg-white p-4.5">
            <div className="mb-2 text-[13px] text-muted-foreground">{s.label}</div>
            <div className="text-[28px] font-bold text-foreground">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
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
          <h3 className="mb-3.5 text-base font-bold text-foreground">Duyurular</h3>
          {ANNOUNCEMENTS.map((a) => (
            <div key={a.title} className="border-t border-[#F0F2F3] py-3 first:border-t-0">
              <div className="text-[13px] font-semibold text-foreground">{a.title}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{a.date}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
