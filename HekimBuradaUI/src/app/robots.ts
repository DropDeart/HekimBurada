import type { MetadataRoute } from "next";
import { SITE_URL } from "./layout";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/callback",
          "/mesajlar",
          "/profil",
          "/ilanlarim",
          "/taleplerim",
          "/favoriler",
          "/ilan-ver",
          "/talep-ver",
          "/kayit-ol/dogrula",
          "/kayit-ol/belge-yukle",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
