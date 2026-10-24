import type { OrganizerProfile } from "@biketrips/domain";

import type { OrganizerEntity } from "../../infrastructure/database/entities/organizer.entity.js";
import type { TripEntity } from "../../infrastructure/database/entities/trip.entity.js";
import { serializeTripSummary } from "../trips/trips.serializer.js";

export interface OrganizerProfileTrips {
  upcomingTrips: TripEntity[];
  pastTrips: TripEntity[];
  completedTripsCount: number;
}

/**
 * The public organizer page. Fields are listed one by one so that contacts on the user
 * (email, phone, Telegram) or the organizer (contact URL) can never leak into it.
 */
export function serializeOrganizerProfile(
  organizer: OrganizerEntity,
  trips: OrganizerProfileTrips,
): OrganizerProfile {
  return {
    id: organizer.id,
    userId: organizer.userId,
    displayName:
      organizer.kind === "channel"
        ? organizer.displayName
        : (organizer.user?.name ?? organizer.displayName),
    avatarUrl: organizer.kind === "channel" ? null : (organizer.user?.avatarUrl ?? null),
    city: organizer.kind === "channel" ? null : (organizer.user?.city?.name ?? null),
    bio: organizer.bio,
    isVerified: organizer.isVerified,
    organizingSince: organizer.createdAt.toISOString(),
    completedTripsCount: trips.completedTripsCount,
    upcomingTrips: trips.upcomingTrips.map((trip) => serializeTripSummary(trip)),
    pastTrips: trips.pastTrips.map((trip) => serializeTripSummary(trip)),
  };
}
