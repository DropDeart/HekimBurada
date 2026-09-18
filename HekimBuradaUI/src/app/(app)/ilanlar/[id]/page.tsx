import type { Metadata } from "next";
import { SITE_URL } from "@/app/layout";
import { fetchListing } from "@/lib/serverApi";
import ListingDetailClient from "./ListingDetailClient";

/**
 * Bilinçli olarak `@/lib/api`'den import EDİLMİYOR: o modül transitif olarak `lib/auth.ts`'i
 * çekiyor, o da `useSyncExternalStore` kullanıyor ve Next.js bunu bir Server Component grafiğinde
 * görünce derlemeyi reddediyor (aynı tuzak app/layout.tsx'te de yazılı).
 */
const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:5080";

/**
 * İlan detay sayfasının Server Component kabuğu.
 *
 * Önceden bu dosya doğrudan "use client" idi; Next.js bir client component'ten `generateMetadata`
 * dışa aktarılmasına izin vermediği için TÜM ilanlar aynı "İlanlar | HekimBurada" başlığını
 * taşıyordu — yüzlerce ilan arama sonucunda birbirinden ayırt edilemezdi. Etkileşimli gövde
 * ListingDetailClient'a taşındı, burada yalnızca ilana özel metadata ve Product yapılandırılmış
 * verisi üretiliyor.
 */

export const revalidate = 300;

/** İlan görsellerinin JSON dizisini çözer — bozuk/boş veride sessizce boş dizi döner. */
function parseImages(images: string): string[] {
  try {
    const parsed = JSON.parse(images) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function absoluteImageUrl(path: string): string {
  return path.startsWith("http") ? path : `${GATEWAY_URL}${path}`;
}

/** Meta açıklaması için ilan metnini tek satıra indirger ve ~155 karaktere kısaltır. */
function metaDescription(title: string, description: string, city: string): string {
  const flat = description.replace(/\s+/g, " ").trim();
  const base = flat.length > 0 ? flat : `${title} — ${city} ilanı.`;
  return base.length <= 155 ? base : `${base.slice(0, 152).trimEnd()}…`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listing = await fetchListing(id);

  // İlan yoksa/yayında değilse aramaya kapat: yanlışlıkla indekslenip sonra 404'e dönmesin.
  if (!listing) {
    return { title: "İlan bulunamadı", robots: { index: false, follow: false } };
  }

  const images = parseImages(listing.images).map(absoluteImageUrl);
  const description = metaDescription(listing.title, listing.description, listing.city);

  return {
    title: listing.title,
    description,
    alternates: { canonical: `/ilanlar/${listing.id}` },
    openGraph: {
      type: "article",
      title: listing.title,
      description,
      url: `${SITE_URL}/ilanlar/${listing.id}`,
      images: images.length > 0 ? images.slice(0, 1) : undefined,
    },
  };
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await fetchListing(id);

  /**
   * Product yapılandırılmış verisi — yalnızca sayfada GÖRÜNEN bilgilerden üretiliyor (Google,
   * görünmeyen içeriğin yapılandırılmış veriye konmasını politika ihlali sayıyor). Fiyatı
   * olmayan ilanlarda (bedelsiz/görüşülür) `offers` hiç eklenmiyor; uydurma bir fiyat yazmaktansa
   * alanı atlamak doğru.
   */
  const jsonLd = listing
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: listing.title,
        description: listing.description,
        image: parseImages(listing.images).map(absoluteImageUrl),
        ...(listing.price
          ? {
              offers: {
                "@type": "Offer",
                price: listing.price,
                priceCurrency: "TRY",
                availability: "https://schema.org/InStock",
                url: `${SITE_URL}/ilanlar/${listing.id}`,
              },
            }
          : {}),
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ListingDetailClient />
    </>
  );
}
