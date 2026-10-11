import { describe, expect, it } from "vitest";

import type { OrganizerEntity } from "../../infrastructure/database/entities/organizer.entity.js";
import type { TripEntity } from "../../infrastructure/database/entities/trip.entity.js";
import type { UserEntity } from "../../infrastructure/database/entities/user.entity.js";
import { serializeOrganizerProfile } from "./organizers.serializer.js";

describe("serializeOrganizerProfile", () => {
  it("shows the name, city, bio and trips but none of the contacts", () => {
    const profile = serializeOrganizerProfile(createOrganizer(), {
      upcomingTrips: [createTrip()],
      pastTrips: [],
      completedTripsCount: 3,
    });

    expect(profile).toEqual({
      id: "organizer-1",
      userId: "user-1",
      displayName: "Алексей",
      avatarUrl: "https://t.me/i/userpic/320/alex.jpg",
      city: "Москва",
      bio: "Гравийные маршруты по выходным",
      isVerified: true,
      organizingSince: "2026-05-01T08:00:00.000Z",
      completedTripsCount: 3,
      upcomingTrips: [expect.objectContaining({ id: "trip-1", organizerId: "organizer-1" })],
      pastTrips: [],
    });
    const serialized = JSON.stringify(profile);
    for (const secret of ["alex@example.com", "+7 (999) 000-00-00", "alex_rides", "https://t.me/alex"]) {
      expect(serialized).not.toContain(secret);
    }
  });

  it("falls back to the organizer display name and leaves optional fields empty", () => {
    const organizer = createOrganizer({ bio: null });
    organizer.user = { ...organizer.user, name: undefined, avatarUrl: null, city: null } as unknown as UserEntity;

    expect(
      serializeOrganizerProfile(organizer, { upcomingTrips: [], pastTrips: [], completedTripsCount: 0 }),
    ).toMatchObject({ displayName: "Организатор", avatarUrl: null, city: null, bio: null });
  });
});

function createOrganizer(input: Partial<OrganizerEntity> = {}): OrganizerEntity {
  return {
    id: "organizer-1",
    displayName: "Организатор",
    bio: "Гравийные маршруты по выходным",
    contactUrl: "https://t.me/alex",
    isVerified: true,
    userId: "user-1",
    user: {
      id: "user-1",
      name: "Алексей",
      email: "alex@example.com",
      phoneNumber: "+7 (999) 000-00-00",
      telegramUsername: "alex_rides",
      avatarUrl: "https://t.me/i/userpic/320/alex.jpg",
      city: { id: "city-1", name: "Москва" },
    } as UserEntity,
    trips: [],
    createdAt: new Date("2026-05-01T08:00:00.000Z"),
    updatedAt: new Date("2026-05-01T08:00:00.000Z"),
    ...input,
  };
}

function createTrip(): TripEntity {
  return {
    id: "trip-1",
    publicSlug: "forest-route",
    title: "Forest route",
    organizerId: "organizer-1",
    cityId: "city-1",
    city: { id: "city-1", name: "Москва" },
    startAt: new Date("2099-08-16T08:00:00.000Z"),
    distanceKm: "42",
    difficulty: "medium",
    paceMax: 24,
    bikeType: "gravel",
    asphaltPercent: 70,
    unpavedPercent: 30,
    unpavedSurfaceDetails: [],
    dropPolicy: "no_drop",
    status: "published",
    moderationStatus: "approved",
    moderationComment: null,
    pendingRevision: null,
    maxParticipants: 10,
    participants: [],
    coverImage: null,
  } as unknown as TripEntity;
}
