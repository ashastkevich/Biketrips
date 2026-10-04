import { describe, expect, it } from "vitest";

import type { OrganizerEntity } from "../../infrastructure/database/entities/organizer.entity.js";
import type { RouteFileEntity } from "../../infrastructure/database/entities/route-file.entity.js";
import type { TripEntity } from "../../infrastructure/database/entities/trip.entity.js";
import type { TripParticipantEntity } from "../../infrastructure/database/entities/trip-participant.entity.js";
import type { TripUpdateEntity } from "../../infrastructure/database/entities/trip-update.entity.js";
import type { UserEntity } from "../../infrastructure/database/entities/user.entity.js";
import type { WaitlistEntryEntity } from "../../infrastructure/database/entities/waitlist-entry.entity.js";
import { serializeTripDetail, serializeTripSummary } from "./trips.serializer.js";

const tripId = "11111111-1111-4111-8111-111111111111";

describe("trip serializers", () => {
  it("serializes a public trip summary with numeric values and participant counts", () => {
    const trip = createTrip({
      paceMax: 30,
      participants: [
        createParticipant({ status: "confirmed" }),
        createParticipant({ id: "participant-2", status: "waitlisted" }),
      ],
    });

    expect(serializeTripSummary(trip)).toEqual({
      id: tripId,
      slug: "forest-route",
      title: "Forest route",
      cityId: "city-1",
      city: "Москва",
      startDateTime: "2099-08-16T08:00:00.000Z",
      distanceKm: 42.5,
      difficulty: "medium",
      pace: "fast",
      bikeType: "gravel",
      asphaltPercent: 70,
      unpavedPercent: 30,
      unpavedSurfaceDetails: ["hardpack"],
      dropPolicy: "no_drop",
      status: "published",
      moderationStatus: "approved",
      moderationComment: null,
      hasPendingRevision: false,
      capacity: 10,
      confirmedParticipants: 1,
      coverImage: "/cover.webp",
    });
  });

  it("serializes a trip detail with route file, organizer, waitlist and updates", () => {
    const organizerUser = createUser({ name: "Organizer real name" });
    const waitlistedUser = createUser({
      id: "waitlisted-user",
      name: "Waitlisted rider",
    });
    const trip = createTrip({
      paceMax: 24,
      startLat: null,
      startLng: null,
      organizer: createOrganizer({
        displayName: "Fallback name",
        user: organizerUser,
      }),
      participants: [
        createParticipant({
          telegramUsername: "rider",
          phone: "+7 (999) 000-00-00",
        }),
      ],
      waitlistEntries: [
        createWaitlistEntry({
          user: waitlistedUser,
          promotedAt: new Date("2099-08-16T09:00:00.000Z"),
        }),
      ],
      updates: [createTripUpdate()],
      routeFiles: [
        createRouteFile({
          originalName: Buffer.from("маршрут.gpx", "utf8").toString("latin1"),
        }),
      ],
    });

    expect(serializeTripDetail(trip)).toMatchObject({
      pace: "steady",
      startLat: null,
      startLng: null,
      routeGpxFileName: "маршрут.gpx",
      routeGpxDownloadUrl: `/trips/${tripId}/route-file`,
      organizer: {
        id: "organizer-1",
        userId: "organizer-user",
        displayName: "Organizer real name",
        isVerified: true,
      },
      participants: [
        {
          id: "participant-1",
          status: "confirmed",
          userId: "participant-user",
          name: "Participant",
          telegramUsername: "rider",
          phone: "+7 (999) 000-00-00",
        },
      ],
      waitlist: [
        {
          id: "waitlist-1",
          position: 1,
          userId: "waitlisted-user",
          name: "Waitlisted rider",
          promotedAt: "2099-08-16T09:00:00.000Z",
        },
      ],
      updates: [
        {
          id: "update-1",
          title: "Update",
          body: "Details changed",
          createdAt: "2099-08-16T10:00:00.000Z",
        },
      ],
    });
  });
});

function createTrip(input: Partial<TripEntity> = {}): TripEntity {
  return {
    id: tripId,
    title: "Forest route",
    description: "A ride through forest roads",
    startAt: new Date("2099-08-16T08:00:00.000Z"),
    startLocationName: "Park",
    startLat: "55.755864",
    startLng: "37.617698",
    distanceKm: "42.5",
    paceMin: 18,
    paceMax: 24,
    difficulty: "medium",
    bikeType: "gravel",
    asphaltPercent: 70,
    unpavedPercent: 30,
    unpavedSurfaceDetails: ["hardpack"],
    dropPolicy: "no_drop",
    routeDescription: "Loop route",
    equipmentRequirements: "Helmet",
    rules: "Ride safely",
    maxParticipants: 10,
    registrationMode: "automatic",
    coverImage: "/cover.webp",
    status: "published",
    publicSlug: "forest-route",
    organizer: createOrganizer(),
    organizerId: "organizer-1",
    city: {
      id: "city-1",
      name: "Москва",
      slug: "moscow",
      timezone: "Europe/Moscow",
      centerLat: "55.755864",
      centerLng: "37.617698",
      trips: [],
    },
    cityId: "city-1",
    participants: [],
    waitlistEntries: [],
    updates: [],
    routeFiles: [],
    createdAt: new Date("2099-08-01T08:00:00.000Z"),
    updatedAt: new Date("2099-08-01T08:00:00.000Z"),
    ...input,
    moderationStatus: input.moderationStatus ?? "approved",
    moderationComment: input.moderationComment ?? null,
    pendingRevision: input.pendingRevision ?? null,
    pendingCoverStorageKey: input.pendingCoverStorageKey ?? null,
    submittedForReviewAt: input.submittedForReviewAt ?? null,
    moderatedAt: input.moderatedAt ?? null,
    moderatedByUserId: input.moderatedByUserId ?? null,
  };
}

function createOrganizer(input: Partial<OrganizerEntity> = {}): OrganizerEntity {
  return {
    id: "organizer-1",
    displayName: "Organizer",
    bio: null,
    contactUrl: null,
    isVerified: true,
    userId: "organizer-user",
    user: createUser({ id: "organizer-user", name: "Organizer" }),
    trips: [],
    createdAt: new Date("2099-08-01T08:00:00.000Z"),
    updatedAt: new Date("2099-08-01T08:00:00.000Z"),
    ...input,
  };
}

function createUser(input: Partial<UserEntity> = {}): UserEntity {
  return {
    id: "user-1",
    name: "User",
    email: null,
    emailVerifiedAt: null,
    role: "user",
    phoneNumber: null,
    phoneVerifiedAt: null,
    avatarUrl: null,
    cityId: null,
    city: null,
    createdAt: new Date("2099-08-01T08:00:00.000Z"),
    updatedAt: new Date("2099-08-01T08:00:00.000Z"),
    organizerProfiles: [],
    telegramAccounts: [],
    tripParticipants: [],
    ...input,
  };
}

function createParticipant(input: Partial<TripParticipantEntity> = {}): TripParticipantEntity {
  return {
    id: "participant-1",
    status: "confirmed",
    name: "Participant",
    telegramUsername: null,
    phone: null,
    comment: null,
    trip: null as unknown as TripEntity,
    tripId,
    user: createUser({ id: "participant-user" }),
    userId: "participant-user",
    createdAt: new Date("2099-08-01T08:00:00.000Z"),
    updatedAt: new Date("2099-08-01T08:00:00.000Z"),
    ...input,
  };
}

function createWaitlistEntry(input: Partial<WaitlistEntryEntity> = {}): WaitlistEntryEntity {
  return {
    id: "waitlist-1",
    position: 1,
    promotedAt: null,
    trip: null as unknown as TripEntity,
    tripId,
    user: createUser({ id: "waitlisted-user" }),
    userId: "waitlisted-user",
    createdAt: new Date("2099-08-01T08:00:00.000Z"),
    ...input,
  };
}

function createTripUpdate(input: Partial<TripUpdateEntity> = {}): TripUpdateEntity {
  return {
    id: "update-1",
    trip: null as unknown as TripEntity,
    tripId,
    title: "Update",
    body: "Details changed",
    createdAt: new Date("2099-08-16T10:00:00.000Z"),
    ...input,
  };
}

function createRouteFile(input: Partial<RouteFileEntity> = {}): RouteFileEntity {
  return {
    id: "route-file-1",
    storageKey: `${tripId}/route.gpx`,
    originalName: "route.gpx",
    contentType: "application/gpx+xml",
    trip: null as unknown as TripEntity,
    tripId,
    createdAt: new Date("2099-08-01T08:00:00.000Z"),
    ...input,
  };
}
