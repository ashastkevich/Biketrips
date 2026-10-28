import type { OrganizerProfile, TripDetail, TripOrganizer } from "@biketrips/domain";

import { getOrganizerHref } from "./organizer-links";
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL, type SocialImage } from "./site";
import { getTripHref } from "./trip-links";

// schema.org JSON-LD for search engines: trips are events, so Google and Yandex can show their
// date and start place in results. Every URL is absolute, as the formats require.

type JsonLd = Record<string, unknown>;

const schemaContext = "https://schema.org";

function absoluteUrl(path: string): string {
  return /^https?:\/\//.test(path) ? path : `${SITE_URL}${path}`;
}

function describeOrganizer(organizer: TripOrganizer): JsonLd {
  return {
    "@type": organizer.kind === "person" ? "Person" : "Organization",
    name: organizer.displayName,
    url: absoluteUrl(getOrganizerHref(organizer.id)),
  };
}

function breadcrumbs(items: { name: string; path: string }[]): JsonLd {
  return {
    "@context": schemaContext,
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

const homeCrumb = { name: SITE_NAME, path: "/" };

export function getHomeJsonLd(): JsonLd[] {
  return [
    {
      "@context": schemaContext,
      "@type": "WebSite",
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      description: DEFAULT_DESCRIPTION,
      inLanguage: "ru",
    },
    {
      "@context": schemaContext,
      "@type": "Organization",
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      logo: absoluteUrl("/icon.svg"),
    },
  ];
}

export function getTripJsonLd(
  trip: TripDetail,
  { description, image }: { description: string; image: SocialImage },
): JsonLd[] {
  const url = absoluteUrl(getTripHref(trip));
  const hasCoordinates = trip.startLat !== null && trip.startLng !== null;
  // Imported trips belong to the channel they came from; the post may name who actually leads it.
  const organizer = trip.importedOrganizer ?? trip.organizer;

  const event: JsonLd = {
    "@context": schemaContext,
    "@type": "Event",
    name: trip.title,
    description,
    url,
    image: [absoluteUrl(image.url)],
    startDate: trip.startDateTime,
    eventStatus:
      trip.status === "cancelled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: trip.startLocationName,
      address: {
        "@type": "PostalAddress",
        addressLocality: trip.city,
        addressCountry: "RU",
      },
      ...(hasCoordinates
        ? { geo: { "@type": "GeoCoordinates", latitude: trip.startLat, longitude: trip.startLng } }
        : {}),
    },
    organizer: describeOrganizer(organizer),
    ...(trip.capacity !== null
      ? {
          maximumAttendeeCapacity: trip.capacity,
          remainingAttendeeCapacity: Math.max(trip.capacity - trip.confirmedParticipants, 0),
        }
      : {}),
  };

  return [event, breadcrumbs([homeCrumb, { name: trip.title, path: getTripHref(trip) }])];
}

export function getOrganizerJsonLd(profile: Pick<OrganizerProfile, "id" | "displayName">): JsonLd[] {
  return [breadcrumbs([homeCrumb, { name: profile.displayName, path: getOrganizerHref(profile.id) }])];
}

/** JSON for a <script> body: "<" is escaped so text from trips cannot close the tag. */
export function serializeJsonLd(data: JsonLd[]): string {
  return JSON.stringify(data.length === 1 ? data[0] : data).replace(/</g, "\\u003c");
}
