"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { IlanFormWizard } from "@/components/listing/IlanFormWizard";
import { marketplaceApi, type Listing } from "@/lib/api";
import { auth } from "@/lib/auth";

/** Sadece bu durumlardaki ilanlar düzenlenebilir — yayındaki/satılmış/kaldırılmış bir ilan için
 * "Yenile"/"Yeniden Yayınla" akışları var (bkz. ilanlarim sayfası), tam düzenleme burada değil. */
const EDITABLE_STATUSES: Listing["status"][] = ["draft", "pending", "rejected"];

export default function IlanDuzenlePage() {
  const params = useParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    marketplaceApi
      .getListing(params.id)
      .then((l) => {
        const myId = auth.getUserId();
        if (l.sellerId !== myId) {
          setError("Bu ilanı düzenleme yetkiniz yok.");
          return;
        }
        if (!EDITABLE_STATUSES.includes(l.status)) {
          setError("Bu durumdaki bir ilan düzenlenemez.");
          return;
        }
        setListing(l);
      })
      .catch(() => setError("İlan bulunamadı."));
  }, [params.id]);

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <h1 className="text-xl font-bold text-foreground">İlanı Düzenle</h1>
        <p className="max-w-md text-sm text-muted-foreground">{error}</p>
        <Link href="/ilanlarim">
          <Button variant="outline">İlanlarıma Dön</Button>
        </Link>
      </div>
    );
  }

  if (!listing) {
    return null;
  }

  return <IlanFormWizard initial={listing} />;
}
