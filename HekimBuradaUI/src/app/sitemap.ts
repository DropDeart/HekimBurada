import type { MetadataRoute } from "next";
import { SITE_URL } from "./layout";

const COMMUNITY_URL = process.env.NEXT_PUBLIC_COMMUNITY_URL ?? "http://localhost:5110";

const STATIC_ROUTES = [
  "",
  "/hakkimizda",
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: path === "" ? "daily" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }));

  const communityEntries = await fetchOpenCommunityUrls();
  return [...staticEntries, ...communityEntries];
}
