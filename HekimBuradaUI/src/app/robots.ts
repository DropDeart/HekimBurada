import type { MetadataRoute } from "next";
import { SITE_URL } from "./layout";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/callback", "/mesajlar", "/profil", "/ilanlarim", "/taleplerim", "/favoriler"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
