import type { MetadataRoute } from "next";
import { SITE_URL } from "./layout";

const COMMUNITY_URL = process.env.NEXT_PUBLIC_COMMUNITY_URL ?? "http://localhost:5110";
const MARKETPLACE_URL = process.env.NEXT_PUBLIC_MARKETPLACE_URL ?? "http://localhost:5100";

const STATIC_ROUTES = [
  "",
  "/ilanlar",
  "/talepler",
  "/hakkimizda",
  "/sss",
  "/iletisim",
  "/gizlilik-politikasi",
  "/kullanim-kosullari",
  "/dogrulama-sureci",
  "/duyuru-panosu",
  "/topluluk",
];

interface CommunityCategoryRow {
  id: string;
  isClosed: boolean;
}

interface TopicRow {
  id: string;
  categoryId: string;
  createdAt: string;
}

interface PagedResult<T> {
  items: T[];
}

/** Anonim (token'sız) çağrı — backend kapalı (isClosed) toplulukların kategori/konu listesini zaten
 * anonime filtreler (bkz. Community.Controllers.TopicsController), burada ayrıca süzmeye gerek yok. */
async function fetchOpenCommunityUrls(): Promise<MetadataRoute.Sitemap> {
  try {
    const categoriesRes = await fetch(`${COMMUNITY_URL}/api/communitycategorys?pageSize=100`, {
      next: { revalidate: 3600 },
    });
    if (!categoriesRes.ok) return [];
    const categories = (await categoriesRes.json()) as PagedResult<CommunityCategoryRow>;
    const openCategories = categories.items.filter((c) => !c.isClosed);

    const topicsRes = await fetch(`${COMMUNITY_URL}/api/topics?pageSize=200`, {
      next: { revalidate: 3600 },
    });
    const topics = topicsRes.ok ? ((await topicsRes.json()) as PagedResult<TopicRow>).items : [];

    return [
      ...openCategories.map(
        (c): MetadataRoute.Sitemap[number] => ({
          url: `${SITE_URL}/topluluk/${c.id}`,
          changeFrequency: "daily",
          priority: 0.6,
        })
      ),
      ...topics.map(
        (t): MetadataRoute.Sitemap[number] => ({
          url: `${SITE_URL}/topluluk/${t.categoryId}/${t.id}`,
          lastModified: t.createdAt,
          changeFrequency: "weekly",
          priority: 0.5,
        })
      ),
    ];
  } catch {
    return [];
  }
}

/**
 * Yayındaki ilanların URL'leri. Marketplace okuma uçları anonime açıldığı için token'sız
 * çekilebiliyor; backend anonim çağrıda zaten yalnızca "active" ilan döndürüyor.
 * Sitemap'in tamamı tek bir servise bağlı kalmasın diye hata durumunda boş dizi dönüyor.
 */
async function fetchListingUrls(): Promise<MetadataRoute.Sitemap> {
  try {
    const res = await fetch(`${MARKETPLACE_URL}/api/Listings?pageSize=1000`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const result = (await res.json()) as PagedResult<{
      id: string;
      status: string;
      publishedAt: string | null;
    }>;
    return result.items
      .filter((l) => l.status === "active")
      .map((l) => ({
        url: `${SITE_URL}/ilanlar/${l.id}`,
        lastModified: l.publishedAt ?? undefined,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: path === "" ? "daily" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }));

  const [communityEntries, listingEntries] = await Promise.all([
    fetchOpenCommunityUrls(),
    fetchListingUrls(),
  ]);
  return [...staticEntries, ...listingEntries, ...communityEntries];
}
