import type { CarouselSlide, Listing, MarketplaceCategory, MarketplaceRequest } from "@/lib/api";

/**
 * Sunucu tarafında (Server Component içinden) çağrılan, TOKENSIZ okuma yardımcıları.
 *
 * Neden `lib/api.ts` kullanılmıyor: o modül transitif olarak `lib/auth.ts`'i çekiyor, o da
 * `useSyncExternalStore` kullanıyor — Next.js "use client" olmayan bir modülde client-only hook
 * görünce derlemeyi reddediyor (aynı gerekçe `app/layout.tsx`'te de yazılı). Buradan yalnızca TİP
 * import ediliyor; tipler derleme zamanında silindiği için çalışma zamanına hiçbir şey sızmıyor.
 *
 * Bu uçlar Marketplace'te anonime açıldı (Categorys/Listings/Requests okuma). Anonim çağrıda backend
 * ilan listesini yalnızca "active" durumla sınırlıyor, taslak/onay bekleyen ilan dönmüyor.
 */

const MARKETPLACE_URL = process.env.NEXT_PUBLIC_MARKETPLACE_URL ?? "http://localhost:5100";
const COMMUNITY_URL = process.env.NEXT_PUBLIC_COMMUNITY_URL ?? "http://localhost:5110";
const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:5080";

/** Ana sayfa ISR penceresi (saniye). Yeni ilan en geç bu sürede ana sayfaya düşer. */
const REVALIDATE_SECONDS = 300;

interface PagedResult<T> {
  items: T[];
}

/**
 * Tek bir GET isteği — hata durumunda fırlatmaz, `fallback` döner. Ana sayfanın tamamı tek bir
 * servisin ayakta olmasına bağlı kalmasın diye: Marketplace kapalıyken bile pazarlama içeriği,
 * SSS ve doğrulama bölümleri sunucudan render edilmeye devam eder.
 */
async function getJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

/** Kategori ağacının tamamı (üst + alt). */
export async function fetchCategories(): Promise<MarketplaceCategory[]> {
  const result = await getJson<PagedResult<MarketplaceCategory>>(
    `${MARKETPLACE_URL}/api/Categorys?pageSize=200`,
    { items: [] }
  );
  return result.items ?? [];
}

/** Yayındaki ilanlar — anonim çağrıda backend zaten "active" ile sınırlıyor, burada da süzüyoruz. */
export async function fetchActiveListings(pageSize: number): Promise<Listing[]> {
  const result = await getJson<PagedResult<Listing>>(
    `${MARKETPLACE_URL}/api/Listings?pageSize=${pageSize}`,
    { items: [] }
  );
  return (result.items ?? []).filter((l) => l.status === "active");
}

/**
 * Tek bir ilan — bulunamazsa veya yayında değilse `null`. Backend anonim çağrıda yayında olmayan
 * ilana 404 döndüğü için burada ayrıca durum kontrolü gerekmiyor, yine de savunma amaçlı süzülüyor.
 */
export async function fetchListing(id: string): Promise<Listing | null> {
  const listing = await getJson<Listing | null>(`${MARKETPLACE_URL}/api/Listings/${id}`, null);
  if (!listing || listing.status !== "active") return null;
  return listing;
}

/** Açık talepler. */
export async function fetchOpenRequests(pageSize: number): Promise<MarketplaceRequest[]> {
  const result = await getJson<PagedResult<MarketplaceRequest>>(
    `${MARKETPLACE_URL}/api/Requests?pageSize=${pageSize}`,
    { items: [] }
  );
  return (result.items ?? []).filter((r) => r.status === "open");
}

/** Ana sayfadaki branş toplulukları kartı için gereken alanlar. */
export interface CommunitySummary {
  id: string;
  name: string;
  kind: string;
  description: string;
  isClosed: boolean;
}

/**
 * Branş toplulukları. Kapalı (isClosed) topluluklar da döner: Community servisi anonime yalnızca
 * topluluğun ADINI/açıklamasını/kapalılık durumunu açıyor, İÇERİĞİNİ (konu ve yorumlar) değil —
 * bkz. CommunityCategorysController doc yorumu.
 */
export async function fetchCommunities(pageSize: number): Promise<CommunitySummary[]> {
  const result = await getJson<PagedResult<CommunitySummary>>(
    `${COMMUNITY_URL}/api/communitycategorys?pageSize=${pageSize}`,
    { items: [] }
  );
  return result.items ?? [];
}

/** Admin panelinden yönetilen hero slaytları (hiç yoksa boş dizi — sayfa statik hero'ya düşer). */
export async function fetchCarouselSlides(): Promise<CarouselSlide[]> {
  const slides = await getJson<CarouselSlide[]>(
    `${GATEWAY_URL}/api/carousel-slides?activeOnly=true`,
    []
  );
  return [...slides].sort((a, b) => a.sortOrder - b.sortOrder);
}
