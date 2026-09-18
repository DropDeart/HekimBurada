import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import Script from "next/script";
import { Toaster } from "@/components/ui/sonner";
import type { SiteSettings } from "@/lib/api";
import { CONTACT_EMAIL, OFFICE_ADDRESS } from "@/lib/staticContent";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

/** Marka adı — başlık şablonunda, og:site_name'de ve JSON-LD'de sabit kalmalı; aşağıdaki
 * DEFAULT_TITLE ile karıştırma: o, arama sonucunda görünen tıklanabilir başlık satırıdır. */
const BRAND_NAME = "HekimBurada";
/** Ana sayfanın (ve kendi metadata'sını vermeyen sayfaların) başlığı. Yalnızca marka adı
 * yazmak arama sonucunda hiçbir şey anlatmıyordu — ne yaptığımızı da söylemesi gerekiyor.
 * ~60 karakteri aşmasın, Google fazlasını kırpıyor. */
const DEFAULT_TITLE = "HekimBurada — Doktorlara Özel 2. El Pazaryeri";
/** Google kısa/genel açıklamaları yok sayıp snippet'i sayfa metninden kendisi yazıyordu;
 * bu yüzden somut ve ~155 karakter. */
const DEFAULT_DESCRIPTION =
  "Doğrulanmış doktorların tıbbi cihaz, muayenehane ekipmanı ve daha fazlasını güvenle alıp sattığı; branşlarına özel topluluklarda buluştuğu kapalı platform.";
const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:5080";
/** Kanonik prod adresi — OG/Twitter/canonical mutlak URL üretimi (metadataBase) ve JSON-LD için. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hekimburada.com";

/** `lib/api.ts`'i (ve onun transitif olarak import ettiği, `useSyncExternalStore` kullanan
 * `lib/auth.ts`'i) Server Component grafiğine sokmamak için kendi başına, minimal bir fetch —
 * Next.js "use client" olmayan bir modülü sunucu tarafında client-only hook içeriyor diye
 * reddediyor, bu yüzden burada `lib/api.ts`'ten sadece TİP import ediliyor (derleme zamanında
 * silinir, çalışma zamanı etkisi yok), gatewayApi runtime kodu değil. */
async function getSiteSettingsServer(): Promise<SiteSettings | null> {
  try {
    // revalidate: 300 — admin panelinden logo/favicon/SEO değiştiğinde yeniden deploy gerekmeden en
    // geç 5 dakika içinde yansısın diye; no-store'un aksine sayfaların statik/ISR üretilmesine izin
    // verir (önceden no-store TÜM uygulamayı dinamik yapıp Cloudflare/CDN önbelleklemesini
    // engelliyordu, bkz. proje SEO incelemesi notu).
    const res = await fetch(`${GATEWAY_URL}/api/site-settings`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return (await res.json()) as SiteSettings;
  } catch {
    return null;
  }
}

/** Site geneli ayarları (admin panelinden yönetilen SEO/favicon) sunucu tarafında çeker — Gateway
 * erişilemezse (dev'de servis kapalıysa vb.) statik varsayılanlara sessizce düşer. */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettingsServer();
  const title = settings?.defaultMetaTitle || DEFAULT_TITLE;
  const description = settings?.defaultMetaDescription || DEFAULT_DESCRIPTION;
  const iconUrl = settings?.faviconUrl ? `${GATEWAY_URL}${settings.faviconUrl}` : undefined;
  const ogImageUrl = settings?.logoUrl ? `${GATEWAY_URL}${settings.logoUrl}` : undefined;

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: `%s | ${BRAND_NAME}` },
    description,
    icons: iconUrl ? { icon: iconUrl, apple: iconUrl } : undefined,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      siteName: BRAND_NAME,
      title,
      description,
      url: SITE_URL,
      images: ogImageUrl ? [{ url: ogImageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImageUrl ? [ogImageUrl] : undefined,
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getSiteSettingsServer();
  const gaMeasurementId = settings?.gaMeasurementId ?? null;

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND_NAME,
    url: SITE_URL,
    description: settings?.defaultMetaDescription || DEFAULT_DESCRIPTION,
    email: CONTACT_EMAIL,
    address: {
      "@type": "PostalAddress",
      streetAddress: OFFICE_ADDRESS.streetAddress,
      addressLocality: OFFICE_ADDRESS.addressLocality,
      addressRegion: OFFICE_ADDRESS.addressRegion,
      addressCountry: OFFICE_ADDRESS.addressCountry,
    },
    ...(settings?.logoUrl ? { logo: `${GATEWAY_URL}${settings.logoUrl}` } : {}),
  };
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND_NAME,
    url: SITE_URL,
  };

  return (
    <html lang="tr" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        {children}
        <Toaster />
        {gaMeasurementId && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`} strategy="afterInteractive" />
            <Script id="ga-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaMeasurementId}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
