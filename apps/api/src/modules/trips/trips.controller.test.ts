import { BadRequestException, ForbiddenException, StreamableFile } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { TripEntity } from "../../infrastructure/database/entities/trip.entity.js";
import type { TripParticipantEntity } from "../../infrastructure/database/entities/trip-participant.entity.js";
import type { UserEntity } from "../../infrastructure/database/entities/user.entity.js";
import { TripsController } from "./trips.controller.js";
import type { CreateTripDto } from "./dto/trip.dto.js";

const tripId = "11111111-1111-4111-8111-111111111111";

describe("TripsController", () => {
  it("lists serialized trip summaries", async () => {
    const context = createTripsController();
    context.tripsService.list.mockResolvedValue([createTrip()]);

    const result = await context.controller.list({ city: "moscow" });

    expect(context.tripsService.list).toHaveBeenCalledWith({ city: "moscow" });
    expect(result).toMatchObject([
      {
        id: tripId,
        slug: "forest-route",
        title: "Forest route",
      },
    ]);
  });

  it("lists my trips and shows pending revisions only to the organizer", async () => {
    const context = createTripsController();
    const pendingRevision = { description: "Updated description" };
    const organizedTrip = { ...createTrip(), pendingRevision };
    const joinedTrip = {
      ...createTrip(),
      id: "22222222-2222-4222-8222-222222222222",
      pendingRevision,
      organizer: { ...createTrip().organizer, userId: "user-2" },
    };
    context.tripsService.listMine.mockResolvedValue([organizedTrip, joinedTrip]);

    const result = await context.controller.listMine({ user: { id: "user-1" } });

    expect(context.tripsService.listMine).toHaveBeenCalledWith("user-1");
    expect(result.map((trip) => trip.description)).toEqual([
      "Updated description",
      "A ride through forest roads",
    ]);
  });

  it("hides participant contacts from viewers who do not manage the trip", async () => {
    const context = createTripsController();
    const trip = {
      ...createTrip(),
      participants: [
        createParticipant({
          id: "participant-1",
          userId: "user-2",
          user: { phoneNumber: "+79990000002" } as UserEntity,
        }),
        createParticipant({
          id: "participant-2",
          userId: "user-3",
          user: { phoneNumber: "+79990000003" } as UserEntity,
        }),
      ],
    };
    const contactsOf = (result: { participants: Array<{ phone?: string | null }> }) =>
      result.participants.map((participant) => participant.phone);

    context.tripsService.getVisibleBySlugOrId.mockResolvedValue({
      trip,
      includePendingRevision: false,
      canManage: false,
    });
    expect(contactsOf(await context.controller.get(tripId, { user: null }))).toEqual([
      undefined,
      undefined,
    ]);
    expect(
      contactsOf(await context.controller.get(tripId, { user: { id: "user-2", role: "user" } })),
    ).toEqual(["+79990000002", undefined]);

    context.tripsService.getVisibleBySlugOrId.mockResolvedValue({
      trip,
      includePendingRevision: false,
      canManage: true,
    });
    expect(
      contactsOf(await context.controller.get(tripId, { user: { id: "user-1", role: "user" } })),
    ).toEqual(["+79990000002", "+79990000003"]);
  });

  it("lists the feed as full trip cards with contacts only for those who may see them", async () => {
    const context = createTripsController();
    const trip = {
      ...createTrip(),
      participants: [
        createParticipant({
          id: "participant-1",
          userId: "user-2",
          user: { phoneNumber: "+79990000002" } as UserEntity,
        }),
        createParticipant({
          id: "participant-2",
          userId: "user-3",
          user: { phoneNumber: "+79990000003" } as UserEntity,
        }),
      ],
    };
    context.tripsService.listFeed.mockResolvedValue([trip]);
    const contactsOf = (result: Array<{ participants: Array<{ phone?: string | null }> }>) =>
      result[0]!.participants.map((participant) => participant.phone);

    const anonymous = await context.controller.listFeed({ city: "moscow" }, { user: null });

    expect(context.tripsService.listFeed).toHaveBeenCalledWith({ city: "moscow" });
    expect(anonymous[0]).toMatchObject({ id: tripId, description: "A ride through forest roads" });
    expect(contactsOf(anonymous)).toEqual([undefined, undefined]);
    expect(
      contactsOf(await context.controller.listFeed({}, { user: { id: "user-2", role: "user" } })),
    ).toEqual(["+79990000002", undefined]);
    expect(
      contactsOf(await context.controller.listFeed({}, { user: { id: "user-1", role: "user" } })),
    ).toEqual(["+79990000002", "+79990000003"]);
    expect(
      contactsOf(await context.controller.listFeed({}, { user: { id: "admin-1", role: "admin" } })),
    ).toEqual(["+79990000002", "+79990000003"]);
  });

  it("rejects participant management by someone other than the organizer", async () => {
    const context = createTripsController();
    context.tripsService.getManagedTrip.mockRejectedValue(new ForbiddenException());

    await expect(
      context.controller.listParticipants(tripId, { user: { id: "user-2", role: "user" } }),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      context.controller.updateParticipant(
        tripId,
        "participant-1",
        { status: "cancelled" },
        { user: { id: "user-2", role: "user" } },
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(context.participantsService.listForTrip).not.toHaveBeenCalled();
    expect(context.participantsService.updateStatus).not.toHaveBeenCalled();
  });

  it("returns participants to the organizer with profile contacts only", async () => {
    const context = createTripsController();
    context.tripsService.getManagedTrip.mockResolvedValue(createTrip());
    context.participantsService.listForTrip.mockResolvedValue([
      createParticipant({
        id: "participant-1",
        userId: "user-2",
        user: {
          email: "x@y.z",
          phoneNumber: "+7 (999) 000-00-02",
          telegramAccounts: [{ username: "rider" }],
        } as UserEntity,
      }),
    ]);

    const result = await context.controller.listParticipants(tripId, {
      user: { id: "user-1", role: "user" },
    });

    expect(result).toEqual([
      {
        id: "participant-1",
        status: "confirmed",
        userId: "user-2",
        name: "Rider",
        telegramUsername: "rider",
        phone: "+7 (999) 000-00-02",
        email: "x@y.z",
      },
    ]);
  });

  it("sets route download headers and returns a streamable file", async () => {
    const context = createTripsController();
    const response = createHeaderResponse();
    context.tripsService.getRouteFileForDownload.mockResolvedValue({
      fileName: "маршрут (день 1).gpx",
      contentType: "application/gpx+xml",
      content: Buffer.from("<gpx></gpx>"),
    });

    const result = await context.controller.downloadRouteFile(tripId, response);

    expect(result).toBeInstanceOf(StreamableFile);
    expect(response.headers).toMatchObject({
      "Content-Type": "application/gpx+xml",
      "Content-Disposition":
        "attachment; filename*=UTF-8''%D0%BC%D0%B0%D1%80%D1%88%D1%80%D1%83%D1%82%20%28%D0%B4%D0%B5%D0%BD%D1%8C%201%29.gpx",
    });
  });

  it("sets cover image cache headers", async () => {
    const context = createTripsController();
    const response = createHeaderResponse();
    context.tripsService.getCoverImageForDownload.mockResolvedValue({
      contentType: "image/webp",
      content: Buffer.from("cover"),
    });

    const result = await context.controller.downloadCoverImage(tripId, response);

    expect(result).toBeInstanceOf(StreamableFile);
    expect(response.headers).toMatchObject({
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    });
  });

  it("caches versioned cover image URLs for a year", async () => {
    const context = createTripsController();
    const response = createHeaderResponse();
    context.tripsService.getCoverImageForDownload.mockResolvedValue({
      contentType: "image/webp",
      content: Buffer.from("cover"),
    });

    await context.controller.downloadCoverImage(tripId, response, undefined, "1760000000000");

    expect(response.headers["Cache-Control"]).toBe("public, max-age=31536000, immutable");
  });

  it("creates a trip with files from a multipart payload", async () => {
    const context = createTripsController();
    const trip = createTrip();
    const dto = createTripDto();
    const routeFile = {
      originalname: "route.gpx",
      mimetype: "application/gpx+xml",
      size: 11,
      buffer: Buffer.from("<gpx></gpx>"),
    };
    context.tripsService.createWithRouteFile.mockResolvedValue(trip);

    const result = await context.controller.createWithRouteFile(
      { routeGpxFile: [routeFile] },
      { payload: JSON.stringify(dto) },
      { user: createActor() }
    );

    expect(context.tripsService.createWithRouteFile).toHaveBeenCalledWith(
      dto,
      routeFile,
      undefined,
      createActor()
    );
    expect(result).toMatchObject({ id: tripId, title: "Forest route" });
  });

  it("rejects missing and invalid multipart payloads", async () => {
    const context = createTripsController();

    await expect(
      context.controller.createWithRouteFile(undefined, {}, { user: createActor() })
    ).rejects.toThrow(BadRequestException);
    await expect(
      context.controller.createWithRouteFile(undefined, { payload: "{" }, { user: createActor() })
    ).rejects.toThrow(BadRequestException);
  });

  it("updates a trip with multipart files and removeRouteFile flag", async () => {
    const context = createTripsController();
    const coverImage = {
      originalname: "cover.webp",
      mimetype: "image/webp",
      size: 5,
      buffer: Buffer.from("cover"),
    };
    context.tripsService.updateWithRouteFile.mockResolvedValue(createTrip());

    await context.controller.updateWithRouteFile(
      tripId,
      { coverImageFile: [coverImage] },
      { payload: JSON.stringify({ title: "Updated" }), removeRouteFile: "true" },
      { user: { id: "user-1", role: "user" } }
    );

    expect(context.tripsService.updateWithRouteFile).toHaveBeenCalledWith(
      tripId,
      { title: "Updated" },
      undefined,
      coverImage,
      true,
      { id: "user-1", role: "user" }
    );
  });

  it("delegates trip status transitions and participation actions", async () => {
    const context = createTripsController();
    context.tripsService.transition.mockResolvedValue(createTrip());
    context.tripsService.getManagedTrip.mockResolvedValue(createTrip());
    context.participantsService.joinTrip.mockResolvedValue({ id: "participant-1" });
    context.participantsService.getForUser.mockResolvedValue({ id: "participant-1" });
    context.participantsService.cancelForUser.mockResolvedValue({ id: "participant-1" });
    context.participantsService.listForTrip.mockResolvedValue([{ id: "participant-1" }]);
    context.participantsService.updateStatus.mockResolvedValue({
      id: "participant-1",
      status: "confirmed",
    });

    await context.controller.publish(tripId, { user: { id: "user-1", role: "user" } });
    await context.controller.cancel(tripId, { user: { id: "user-1", role: "user" } });
    await context.controller.finish(tripId, { user: { id: "user-1", role: "user" } });
    await context.controller.join(
      tripId,
      { user: { id: "user-1", name: "Alex" } },
      { comment: "See you" }
    );
    await context.controller.participation(tripId, { user: { id: "user-1" } });
    await context.controller.cancelParticipation(tripId, { user: { id: "user-1" } });
    await context.controller.listParticipants(tripId, { user: { id: "user-1", role: "user" } });
    await context.controller.updateParticipant(
      tripId,
      "participant-1",
      { status: "confirmed" },
      { user: { id: "user-1", role: "user" } },
    );

    expect(context.tripsService.transition).toHaveBeenCalledWith(tripId, "published", {
      id: "user-1",
      role: "user",
    });
    expect(context.tripsService.transition).toHaveBeenCalledWith(tripId, "cancelled", {
      id: "user-1",
      role: "user",
    });
    expect(context.tripsService.transition).toHaveBeenCalledWith(tripId, "finished", {
      id: "user-1",
      role: "user",
    });
    expect(context.participantsService.joinTrip).toHaveBeenCalledWith(tripId, {
      userId: "user-1",
      name: "Alex",
      comment: "See you",
    });
    expect(context.tripsService.getManagedTrip).toHaveBeenCalledWith(tripId, {
      id: "user-1",
      role: "user",
    });
    expect(context.participantsService.updateStatus).toHaveBeenCalledWith(
      tripId,
      "participant-1",
      "confirmed"
    );
  });
});

function createTripsController() {
  const tripsService = {
    list: vi.fn(),
    listFeed: vi.fn(),
    listMine: vi.fn(),
    getVisibleBySlugOrId: vi.fn(),
    getManagedTrip: vi.fn(),
    getRouteFileForDownload: vi.fn(),
    getCoverImageForDownload: vi.fn(),
    getBySlugOrId: vi.fn(),
    createWithRouteFile: vi.fn(),
    create: vi.fn(),
    updateWithRouteFile: vi.fn(),
    update: vi.fn(),
    transition: vi.fn(),
  };
  const participantsService = {
    joinTrip: vi.fn(),
    getForUser: vi.fn(),
    cancelForUser: vi.fn(),
    listForTrip: vi.fn(),
    updateStatus: vi.fn(),
  };

  return {
    controller: new TripsController(tripsService as never, participantsService as never),
    tripsService,
    participantsService,
  };
}

function createHeaderResponse() {
  const headers: Record<string, string> = {};

  return {
    headers,
    setHeader: vi.fn((name: string, value: string) => {
      headers[name] = value;
    }),
  };
}

function createTripDto(): CreateTripDto {
  return {
    title: "Forest route",
    description: "A ride through forest roads",
    startAt: "2099-08-16T08:00:00.000Z",
    startLocationName: "Park",
    distanceKm: 42,
    difficulty: "medium",
    asphaltPercent: 70,
    unpavedPercent: 30,
    organizerId: "organizer-1",
    cityId: "city-1",
  };
}

function createActor() {
  return {
    id: "user-1",
    name: "Alex",
    role: "user" as const,
    phoneVerified: true,
  };
}

function createTrip(): TripEntity {
  return {
    id: tripId,
    title: "Forest route",
    description: "A ride through forest roads",
    startAt: new Date("2099-08-16T08:00:00.000Z"),
    startLocationName: "Park",
    startLat: null,
    startLng: null,
    distanceKm: "42",
    paceMin: null,
    paceMax: null,
    difficulty: "medium",
    asphaltPercent: 70,
    unpavedPercent: 30,
    unpavedSurfaceDetails: [],
    routeDescription: null,
    equipmentRequirements: null,
    rules: null,
    maxParticipants: null,
    registrationMode: "automatic",
    coverImage: null,
    source: "native",
    sourceUrl: null,
    externalRegistrationUrl: null,
    status: "published",
    moderationStatus: "approved",
    moderationComment: null,
    pendingRevision: null,
    pendingCoverStorageKey: null,
    submittedForReviewAt: null,
    moderatedAt: new Date("2099-08-01T08:00:00.000Z"),
    moderatedByUserId: null,
    publicSlug: "forest-route",
    importedOrganizer: null,
    importedOrganizerId: null,
    organizer: {
      id: "organizer-1",
      displayName: "Organizer",
      bio: null,
      contactUrl: null,
      kind: "person",
      telegramUsername: null,
      isClaimed: true,
      isVerified: false,
      userId: "user-1",
      user: {
        id: "user-1",
        name: "Organizer",
        email: null,
        emailVerifiedAt: null,
        role: "user",
        phoneNumber: null,
        phoneVerifiedAt: null,
        telegramUsername: null,
        avatarUrl: null,
        cityId: null,
        city: null,
        createdAt: new Date("2099-08-01T08:00:00.000Z"),
        updatedAt: new Date("2099-08-01T08:00:00.000Z"),
        organizerProfiles: [],
        telegramAccounts: [],
        tripParticipants: [],
      },
      trips: [],
      createdAt: new Date("2099-08-01T08:00:00.000Z"),
      updatedAt: new Date("2099-08-01T08:00:00.000Z"),
    },
    organizerId: "organizer-1",
    city: {
      id: "city-1",
      name: "Москва",
      slug: "moscow",
      timezone: "Europe/Moscow",
      centerLat: null,
      centerLng: null,
      trips: [],
    },
    cityId: "city-1",
    participants: [],
    waitlistEntries: [],
    updates: [],
    routeFiles: [],
    createdAt: new Date("2099-08-01T08:00:00.000Z"),
    updatedAt: new Date("2099-08-01T08:00:00.000Z"),
  };
}

function createParticipant(input: Partial<TripParticipantEntity> = {}): TripParticipantEntity {
  return {
    id: "participant-1",
    status: "confirmed",
    name: "Rider",
    telegramUsername: "rider",
    phone: null,
    tripId,
    userId: "user-2",
    ...input,
  } as TripParticipantEntity;
}
