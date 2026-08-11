"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ListingImage } from "@/components/ListingImage";
import { marketplaceApi, type Listing, type MarketplaceCategory } from "@/lib/api";
import { useHasToken } from "@/lib/auth";
import { cn } from "@/lib/utils";

function currency(n: number) {
  return `${n.toLocaleString("tr-TR")} ₺`;
}

function IlanlarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const kategoriId = searchParams.get("kategori");
  const altId = searchParams.get("alt");
  const q = searchParams.get("q") ?? "";

  const hasToken = useHasToken();
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  useEffect(() => {
    if (!hasToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta/oturum değişince veri çekme (React'in "Fetching data" deseni)
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      marketplaceApi.listCategories({ pageSize: 100 }),
      marketplaceApi.listListings({ pageSize: 100, search: q || undefined }),
    ])
      .then(([catsRes, listingsRes]) => {
        setCategories(catsRes.items);
        setListings(listingsRes.items.filter((l) => l.status === "active"));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hasToken, q]);

  const topCategories = categories.filter((c) => !c.parentId);
  const activeCategory = categories.find((c) => c.id === kategoriId);
  const subCategories = kategoriId ? categories.filter((c) => c.parentId === kategoriId) : [];

  const goCategory = (catId: string | null, subId: string | null) => {
    const params = new URLSearchParams();
    if (catId) params.set("kategori", catId);
    if (subId) params.set("alt", subId);
    router.push(`/ilanlar${params.size ? `?${params}` : ""}`);
  };

  const min = minPrice ? Number(minPrice) : null;
  const max = maxPrice ? Number(maxPrice) : null;
  const filtered = listings.filter((l) => {
    if (altId) {
      if (l.categoryId !== altId) return false;
    } else if (kategoriId) {
      const inCategory =
        l.categoryId === kategoriId || subCategories.some((s) => s.id === l.categoryId);
      if (!inCategory) return false;
    }
    if (min !== null && (l.price ?? 0) < min) return false;
    if (max !== null && l.price !== null && l.price > max) return false;
    return true;
  });

  if (!hasToken) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-xl font-bold text-foreground">İlanlar</h1>
        <p className="text-sm text-muted-foreground">İlanları görmek için giriş yapın.</p>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 sm:px-10">
      <div className="mb-4 text-sm text-muted-foreground">
        <Link href="/" className="text-brand">
          Ana Sayfa
        </Link>
        {activeCategory && (
          <>
            {" / "}
            <span className="font-semibold text-foreground">{activeCategory.name}</span>
          </>
        )}
        {altId && (
          <>
            {" / "}
            <span className="font-semibold text-foreground">
              {categories.find((c) => c.id === altId)?.name}
            </span>
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-6">
        <aside className="flex w-full flex-col gap-4 sm:w-60 sm:shrink-0">
          <div className="rounded-[10px] border border-border bg-white p-4.5">
            <div className="mb-3 text-[13px] font-bold text-foreground">Ana Kategoriler</div>
            <div className="flex flex-col">
              {topCategories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => goCategory(c.id, null)}
                  className={cn(
                    "py-1.5 text-left text-[13px]",
                    kategoriId === c.id ? "font-bold text-brand" : "font-medium text-foreground"
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {kategoriId && subCategories.length > 0 && (
            <div className="rounded-[10px] border border-border bg-white p-4.5">
              <div className="mb-3 text-[13px] font-bold text-foreground">
                {activeCategory?.name} - Alt Kategoriler
              </div>
              <button
                onClick={() => goCategory(kategoriId, null)}
                className="flex items-center gap-2 py-1.5 text-left text-[13px]"
              >
                <span
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    !altId ? "bg-brand" : "bg-border"
                  )}
                />
                <span className={!altId ? "font-bold text-brand" : "font-medium text-foreground"}>
                  Tümü
                </span>
              </button>
              {subCategories.map((s) => (
                <button
                  key={s.id}
                  onClick={() => goCategory(kategoriId, s.id)}
                  className="flex items-center gap-2 py-1.5 text-left text-[13px]"
                >
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      altId === s.id ? "bg-brand" : "bg-border"
                    )}
                  />
                  <span
                    className={altId === s.id ? "font-bold text-brand" : "font-medium text-foreground"}
                  >
                    {s.name}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="rounded-[10px] border border-border bg-white p-4.5">
            <div className="mb-3 text-[13px] font-bold text-foreground">Fiyat Aralığı</div>
            <div className="flex gap-2">
              <input
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value.replace(/\D/g, ""))}
                placeholder="Min ₺"
                className="w-full rounded-md border border-input px-2 py-1.5 text-xs outline-none"
              />
              <input
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ""))}
                placeholder="Max ₺"
                className="w-full rounded-md border border-input px-2 py-1.5 text-xs outline-none"
              />
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-3.5 text-[13px] text-muted-foreground">
            {loading ? "Yükleniyor…" : `${filtered.length} ilan bulundu`}
          </div>

          {!loading && filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Bu filtrelerle eşleşen ilan yok.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((l) => (
                <Link
                  key={l.id}
                  href={`/ilanlar/${l.id}`}
                  className="overflow-hidden rounded-[10px] border border-border bg-white"
                >
                  <ListingImage images={l.images} alt={l.title} className="h-[140px] w-full" />
                  <div className="p-3.5">
                    <div className="mb-1 text-sm font-bold text-foreground">{l.title}</div>
                    <div className="mb-1.5 text-[15px] font-bold text-brand">
                      {l.price ? currency(l.price) : "Fiyat belirtilmedi"}
                    </div>
                    <div className="text-xs text-muted-foreground">{l.city}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function IlanlarPage() {
  return (
    <Suspense fallback={null}>
      <IlanlarContent />
    </Suspense>
  );
}
