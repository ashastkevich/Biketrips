import type { TripEntity } from "../../infrastructure/database/entities/trip.entity.js";
import type { TripParticipantEntity } from "../../infrastructure/database/entities/trip-participant.entity.js";
import { normalizeRouteFileName } from "./route-file-names.js";

function countParticipants(
  participants: TripParticipantEntity[] | undefined,
  status: string
): number {
  return participants?.filter((participant) => participant.status === status).length ?? 0;
}

export function serializeTripSummary(trip: TripEntity) {
  return {
    id: trip.id,
    slug: trip.publicSlug,
    title: trip.title,
    cityId: trip.cityId,
    city: trip.city.name,
    startDateTime: trip.startAt.toISOString(),
    distanceKm: Number(trip.distanceKm),
    difficulty: trip.difficulty,
    pace: trip.paceMax && trip.paceMax >= 28 ? "fast" : "steady",
    bikeType: trip.bikeType,
    asphaltPercent: trip.asphaltPercent,
    unpavedPercent: trip.unpavedPercent,
    unpavedSurfaceDetails: trip.unpavedSurfaceDetails,
    dropPolicy: trip.dropPolicy,
    status: trip.status,
    capacity: trip.maxParticipants,
    confirmedParticipants: countParticipants(trip.participants, "confirmed"),
    coverImage: trip.coverImage,
  };
}

export function serializeTripDetail(trip: TripEntity) {
  const routeGpxFile = trip.routeFiles?.[0] ?? null;

  return {
    ...serializeTripSummary(trip),
    description: trip.description,
    startLocationName: trip.startLocationName,
    startLat: trip.startLat === null ? null : Number(trip.startLat),
    startLng: trip.startLng === null ? null : Number(trip.startLng),
    paceMin: trip.paceMin,
    paceMax: trip.paceMax,
    routeDescription: trip.routeDescription,
    equipmentRequirements: trip.equipmentRequirements,
    rules: trip.rules,
    routeGpxFileName: routeGpxFile ? normalizeRouteFileName(routeGpxFile.originalName) : null,
    routeGpxDownloadUrl: routeGpxFile ? `/trips/${trip.id}/route-file` : null,
    registrationMode: trip.registrationMode,
    organizer: {
      id: trip.organizer.id,
      userId: trip.organizer.userId,
      displayName: trip.organizer.user?.name ?? trip.organizer.displayName,
      isVerified: trip.organizer.isVerified,
    },
    participants:
      trip.participants?.map((participant) => ({
        id: participant.id,
        status: participant.status,
        userId: participant.userId,
        name: participant.name,
        telegramUsername: participant.telegramUsername,
        phone: participant.phone,
      })) ?? [],
    waitlist:
      trip.waitlistEntries?.map((entry) => ({
        id: entry.id,
        position: entry.position,
        userId: entry.userId,
        name: entry.user?.name,
        promotedAt: entry.promotedAt?.toISOString() ?? null,
      })) ?? [],
    updates:
      trip.updates?.map((update) => ({
        id: update.id,
        title: update.title,
        body: update.body,
        createdAt: update.createdAt.toISOString(),
      })) ?? [],
  };
}
