import type { MetadataRoute } from "next";

import { legalDocuments } from "./legal/legal-documents";
import { getPublicTrips } from "./lib/api";
import { getOrganizerHref } from "./lib/organizer-links";
import { SITE_URL } from "./lib/site";
import { getTripHref } from "./lib/trip-links";

// Rendered per request: the trip list changes as trips are published and finished.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data: trips } = await getPublicTrips();
  // Organizers with an upcoming public trip; their pages list those trips.
  const organizerIds = [...new Set(trips.map((trip) => trip.organizerId))];

  return [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    ...trips.map((trip) => ({
      url: `${SITE_URL}${getTripHref(trip)}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...organizerIds.map((organizerId) => ({
      url: `${SITE_URL}${getOrganizerHref(organizerId)}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...legalDocuments.map((document) => ({
      url: `${SITE_URL}/legal/${document.slug}`,
      changeFrequency: "yearly" as const,
      priority: 0.2,
    })),
  ];
}
