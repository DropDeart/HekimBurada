import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import Script from "next/script";
import { Toaster } from "@/components/ui/sonner";
import type { SiteSettings } from "@/lib/api";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const DEFAULT_TITLE = "HekimBurada";
const DEFAULT_DESCRIPTION = "Doktorlara özel 2. el pazaryeri ve topluluk platformu";
const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:5080";

/** `lib/api.ts`'i (ve onun transitif olarak import ettiği, `useSyncExternalStore` kullanan
 * `lib/auth.ts`'i) Server Component grafiğine sokmamak için kendi başına, minimal bir fetch —
 * Next.js "use client" olmayan bir modülü sunucu tarafında client-only hook içeriyor diye
 * reddediyor, bu yüzden burada `lib/api.ts`'ten sadece TİP import ediliyor (derleme zamanında
 * silinir, çalışma zamanı etkisi yok), gatewayApi runtime kodu değil. */
async function getSiteSettingsServer(): Promise<SiteSettings | null> {
  try {
    const res = await fetch(`${GATEWAY_URL}/api/site-settings`);
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
  if (!settings) {
    return { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION };
  }

  return {
    title: settings.defaultMetaTitle || DEFAULT_TITLE,
    description: settings.defaultMetaDescription || DEFAULT_DESCRIPTION,
    icons: settings.faviconUrl ? { icon: `${GATEWAY_URL}${settings.faviconUrl}` } : undefined,
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getSiteSettingsServer();
  const gaMeasurementId = settings?.gaMeasurementId ?? null;

  return (
    <html lang="tr" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
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
