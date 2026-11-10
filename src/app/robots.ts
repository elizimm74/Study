// /robots.txt: let search engines see the public pages, keep them out of the private app.
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/app", "/run", "/tests", "/api/", "/s/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
