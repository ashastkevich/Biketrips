import type { MetadataRoute } from "next";

import { SITE_URL } from "./lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin", "/auth/", "/profile", "/trips/new", "/trips/*/edit"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
