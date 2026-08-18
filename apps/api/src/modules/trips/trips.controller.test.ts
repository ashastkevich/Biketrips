import { BadRequestException, StreamableFile } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { TripEntity } from "../../infrastructure/database/entities/trip.entity.js";
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
    await context.controller.listParticipants(tripId);
    await context.controller.updateParticipant(tripId, "participant-1", {
      status: "confirmed",
    });

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
    bikeType: "gravel",
    asphaltPercent: 70,
    unpavedPercent: 30,
    dropPolicy: "no_drop",
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
    bikeType: "gravel",
    asphaltPercent: 70,
    unpavedPercent: 30,
    unpavedSurfaceDetails: [],
    dropPolicy: "no_drop",
    routeDescription: null,
    equipmentRequirements: null,
    rules: null,
    maxParticipants: null,
    registrationMode: "automatic",
    coverImage: null,
    status: "published",
    publicSlug: "forest-route",
    organizer: {
      id: "organizer-1",
      displayName: "Organizer",
      bio: null,
      contactUrl: null,
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
