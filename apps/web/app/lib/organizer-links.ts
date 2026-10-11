import type { OrganizerProfile } from "@biketrips/domain";

import { DEFAULT_TRIP_TIME_ZONE } from "./trip-time";

export function getOrganizerHref(organizerId: string): string {
  return `/organizers/${encodeURIComponent(organizerId)}`;
}

/** Profiles with no public trips stay reachable by link but are kept out of search results. */
export function hasPublicTrips(profile: Pick<OrganizerProfile, "upcomingTrips" | "pastTrips">): boolean {
  return profile.upcomingTrips.length > 0 || profile.pastTrips.length > 0;
}

/** "мая 2026": the genitive month reads naturally after "с". */
export function formatOrganizingSince(value: string): string {
  const date = new Date(value);
  const month = date
    .toLocaleDateString("ru-RU", { timeZone: DEFAULT_TRIP_TIME_ZONE, day: "numeric", month: "long" })
    .replace(/^\d+\s*/, "");
  const year = date.toLocaleDateString("ru-RU", { timeZone: DEFAULT_TRIP_TIME_ZONE, year: "numeric" });

  return `${month} ${year.replace(/\D/g, "")}`;
}

export function describeOrganizer(profile: Pick<OrganizerProfile, "displayName" | "city" | "bio">): string {
  const intro = `${profile.displayName} — организатор велопоездок на BikeTrips${profile.city ? `, ${profile.city}` : ""}.`;
  const bio = profile.bio?.replace(/\s+/g, " ").trim();
  const text = bio ? `${intro} ${bio}` : intro;

  return text.length > 200 ? `${text.slice(0, 197).trimEnd()}…` : text;
}
