import type { MetadataRoute } from "next";
import type { SiteSettings } from "@/lib/api";

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:5080";
const DEFAULT_DESCRIPTION = "Doktorlara özel 2. el pazaryeri ve topluluk platformu";

/** `lib/api.ts`'ten sadece TİP import ediliyor — bkz. layout.tsx'teki aynı desenin doc yorumu. */
async function getSiteSettingsServer(): Promise<SiteSettings | null> {
  try {
    const res = await fetch(`${GATEWAY_URL}/api/site-settings`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return (await res.json()) as SiteSettings;
  } catch {
    return null;
  }
}

/** Admin panelinden yönetilen favicon dışında ayrı bir ikon seti (192/512 px) yok — mevcut favicon
 * "any" boyutla referans alınıyor, tarayıcı kendi ölçekliyor. Gerçek boyutlu bir ikon seti eklenirse
 * (bkz. proje SEO incelemesi) burası güncellenmeli. */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSiteSettingsServer();
  const iconUrl = settings?.faviconUrl ? `${GATEWAY_URL}${settings.faviconUrl}` : null;

  return {
    name: "HekimBurada",
    short_name: "HekimBurada",
    description: settings?.defaultMetaDescription || DEFAULT_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#38cb89",
    icons: iconUrl ? [{ src: iconUrl, sizes: "any", type: "image/png" }] : [],
  };
}
