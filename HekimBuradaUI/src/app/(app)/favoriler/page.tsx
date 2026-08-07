"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { marketplaceApi, type Favorite, type Listing } from "@/lib/api";
import { auth } from "@/lib/auth";

function currency(n: number) {
  return `${n.toLocaleString("tr-TR")} ₺`;
}

export default function FavorilerPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<{ favorite: Favorite; listing: Listing }[]>([]);

  useEffect(() => {
    if (!auth.getToken()) {
      router.push("/giris-yap");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta bir kere token kontrolü (bkz. admin/layout.tsx'teki aynı desen)
    setAuthorized(true);
  }, [router]);

  useEffect(() => {
    if (!authorized) return;
    const myId = auth.getUserId();
    Promise.all([
      marketplaceApi.listFavorites({ pageSize: 200 }),
      marketplaceApi.listListings({ pageSize: 200 }),
    ])
      .then(([favRes, listingsRes]) => {
        const myFavorites = favRes.items.filter((f) => f.userId === myId);
        const joined = myFavorites
          .map((f) => {
            const listing = listingsRes.items.find((l) => l.id === f.listingId);
            return listing ? { favorite: f, listing } : null;
          })
          .filter((r): r is { favorite: Favorite; listing: Listing } => r !== null);
        setRows(joined);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authorized]);

  const removeFavorite = async (favoriteId: string) => {
    try {
      await marketplaceApi.removeFavorite(favoriteId);
      setRows((prev) => prev.filter((r) => r.favorite.id !== favoriteId));
    } catch {
      // sessizce yoksay — kullanıcı tekrar deneyebilir
    }
  };

  if (!authorized) {
    return null;
  }

  return (
    <div className="px-6 py-8 sm:px-10">
      <h1 className="mb-1 text-xl font-bold text-foreground">Favorilerim</h1>
      <p className="mb-6 text-sm text-muted-foreground">Favorilere aldığınız ilanlar.</p>

      {loading ? (
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Henüz favori ilanınız yok.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map(({ favorite, listing }) => (
            <div key={favorite.id} className="overflow-hidden rounded-[10px] border border-border bg-white">
              <Link href={`/ilanlar/${listing.id}`}>
                <div className="flex h-[110px] items-center justify-center bg-[repeating-linear-gradient(135deg,#EEF1F2,#EEF1F2_12px,#E4E8EA_12px,#E4E8EA_24px)]" />
                <div className="p-3">
                  <div className="text-[13px] font-bold text-foreground">{listing.title}</div>
                  <div className="text-[13px] font-bold text-brand">
                    {listing.price ? currency(listing.price) : "Fiyat belirtilmedi"}
                  </div>
                </div>
              </Link>
              <button
                onClick={() => removeFavorite(favorite.id)}
                className="w-full border-t border-border px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                Favoriden Kaldır
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
