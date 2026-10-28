import type { MetadataRoute } from "next";

import { SITE_URL } from "./lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      // Trip covers are og:image targets, so they stay fetchable inside the closed /api/.
      allow: ["/", "/api/trips/*/cover-image"],
      disallow: ["/api/", "/admin", "/auth/", "/profile", "/trips/new", "/trips/*/edit"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
