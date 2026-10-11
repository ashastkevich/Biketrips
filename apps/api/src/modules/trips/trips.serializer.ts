import type { TripEntity } from "../../infrastructure/database/entities/trip.entity.js";
import type { TripParticipantEntity } from "../../infrastructure/database/entities/trip-participant.entity.js";
import { normalizeRouteFileName } from "./route-file-names.js";

function countParticipants(
  participants: TripParticipantEntity[] | undefined,
  status: string
): number {
  return participants?.filter((participant) => participant.status === status).length ?? 0;
}

export interface ParticipantContactsAccess {
  /** Organizer or admin: contacts of every participant are visible. */
  all: boolean;
  /** A participant always sees their own contacts. */
  viewerUserId?: string | null;
}

/** Contacts always come from the participant's current profile, never from signup input. */
function serializeParticipantContacts(participant: TripParticipantEntity) {
  const user = participant.user;
  return {
    telegramUsername:
      user?.telegramAccounts?.find((account) => account.username)?.username ??
      user?.telegramUsername ??
      null,
    phone: user?.phoneNumber ?? null,
    email: user?.email ?? null,
  };
}

export function serializeTripParticipant(
  participant: TripParticipantEntity,
  includeContacts: boolean,
) {
  return {
    id: participant.id,
    status: participant.status,
    userId: participant.userId,
    name: participant.name,
    ...(includeContacts ? serializeParticipantContacts(participant) : {}),
  };
}

export function serializeTripSummary(
  trip: TripEntity,
  options: { includePendingRevision?: boolean } = {},
) {
  const summary = {
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
    moderationStatus: trip.moderationStatus,
    moderationComment: trip.moderationComment,
    hasPendingRevision: trip.pendingRevision !== null,
    capacity: trip.maxParticipants,
    confirmedParticipants: countParticipants(trip.participants, "confirmed"),
    coverImage: trip.coverImage,
  };

  if (options.includePendingRevision && trip.pendingRevision) {
    const pending = trip.pendingRevision;
    if (typeof pending.title === "string") summary.title = pending.title;
    if (typeof pending.coverImage === "string" || pending.coverImage === null) {
      summary.coverImage = pending.coverImage;
    }
  }

  return summary;
}

export function serializeTripDetail(
  trip: TripEntity,
  options: {
    includePendingRevision?: boolean;
    participantContacts?: ParticipantContactsAccess;
  } = {},
) {
  const routeGpxFile = trip.routeFiles?.[0] ?? null;
  const detail = {
    ...serializeTripSummary(trip, options),
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
      trip.participants?.map((participant) =>
        serializeTripParticipant(
          participant,
          Boolean(
            options.participantContacts?.all ||
              (options.participantContacts?.viewerUserId &&
                participant.userId === options.participantContacts.viewerUserId),
          ),
        ),
      ) ?? [],
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

  if (options.includePendingRevision && trip.pendingRevision) {
    const pending = trip.pendingRevision;
    if (typeof pending.description === "string") detail.description = pending.description;
    if (typeof pending.startLocationName === "string") {
      detail.startLocationName = pending.startLocationName;
    }
    if (typeof pending.routeDescription === "string" || pending.routeDescription === null) {
      detail.routeDescription = pending.routeDescription;
    }
    if (
      typeof pending.equipmentRequirements === "string" ||
      pending.equipmentRequirements === null
    ) {
      detail.equipmentRequirements = pending.equipmentRequirements;
    }
    if (typeof pending.rules === "string" || pending.rules === null) {
      detail.rules = pending.rules;
    }
  }

  return detail;
}
