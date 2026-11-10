// /sitemap.xml: the public pages search engines should know about.
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/example", "/example?kind=app", "/pricing", "/tools/paywall-checker", "/accuracy"];
  return pages.map((p) => ({ url: `${SITE_URL}${p}`, lastModified: new Date() }));
}
