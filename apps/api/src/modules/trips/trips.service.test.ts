import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CityEntity } from "../../infrastructure/database/entities/city.entity.js";
import type { OrganizerEntity } from "../../infrastructure/database/entities/organizer.entity.js";
import type { RouteFileEntity } from "../../infrastructure/database/entities/route-file.entity.js";
import type { TripEntity } from "../../infrastructure/database/entities/trip.entity.js";
import type { TripUpdateEntity } from "../../infrastructure/database/entities/trip-update.entity.js";
import type { UserEntity } from "../../infrastructure/database/entities/user.entity.js";
import type { CreateTripDto } from "./dto/trip.dto.js";
import { TripsService } from "./trips.service.js";

const tripId = "11111111-1111-4111-8111-111111111111";
const actorId = "22222222-2222-4222-8222-222222222222";
const cityId = "33333333-3333-4333-8333-333333333333";
const organizerId = "44444444-4444-4444-8444-444444444444";
const futureStart = "2099-08-16T08:00:00.000Z";
const routeFilesDirectory = path.join(process.cwd(), "storage", "route-files");
const coverImagesDirectory = path.join(process.cwd(), "storage", "cover-images");

describe("TripsService", () => {
  afterEach(async () => {
    await rm(path.join(routeFilesDirectory, tripId), { recursive: true, force: true });
    await rm(path.join(coverImagesDirectory, tripId), { recursive: true, force: true });
  });

  it("applies public filters when listing trips", async () => {
    const context = createTripsService();

    await context.service.list({
      city: "moscow",
      difficulty: "medium",
      bikeType: "gravel",
      dateFrom: "2099-08-01T00:00:00.000Z",
      dateTo: "2099-08-31T23:59:59.999Z",
    });

    expect(context.queryBuilder.andWhere).toHaveBeenCalledWith("trip.status = :status", {
      status: "published",
    });
    expect(context.queryBuilder.andWhere).toHaveBeenCalledWith("city.slug = :city", {
      city: "moscow",
    });
    expect(context.queryBuilder.andWhere).toHaveBeenCalledWith("trip.difficulty = :difficulty", {
      difficulty: "medium",
    });
    expect(context.queryBuilder.andWhere).toHaveBeenCalledWith("trip.bikeType = :bikeType", {
      bikeType: "gravel",
    });
    expect(context.queryBuilder.andWhere).toHaveBeenCalledWith("trip.startAt >= :dateFrom", {
      dateFrom: new Date("2099-08-01T00:00:00.000Z"),
    });
  });

  it("lists only upcoming trips by default", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-04T12:00:00.000Z"));
    try {
      const context = createTripsService();

      await context.service.list({});

      expect(context.queryBuilder.andWhere).toHaveBeenCalledWith("trip.startAt >= :dateFrom", {
        dateFrom: new Date("2026-10-04T12:00:00.000Z"),
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not list past trips when dateFrom is in the past", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-04T12:00:00.000Z"));
    try {
      const context = createTripsService();

      await context.service.list({ dateFrom: "2026-01-01T00:00:00.000Z" });

      expect(context.queryBuilder.andWhere).toHaveBeenCalledWith("trip.startAt >= :dateFrom", {
        dateFrom: new Date("2026-10-04T12:00:00.000Z"),
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("creates a draft trip with a unique slug and organizer profile", async () => {
    const context = createTripsService({
      existingSlugs: ["lesnoy-marshrut"],
    });

    const trip = await context.service.create(createTripDto(), {
      id: actorId,
      name: "Alex",
      role: "user",
      phone: "+7 (999) 000-00-00",
      phoneVerified: true,
    });

    expect(trip).toMatchObject({
      title: "Лесной маршрут",
      status: "draft",
      publicSlug: "lesnoy-marshrut-2",
      organizerId,
      cityId,
    });
    expect(context.users).toMatchObject([
      {
        id: actorId,
        name: "Alex",
        phoneNumber: "+7 (999) 000-00-00",
      },
    ]);
    expect(context.organizers).toMatchObject([
      {
        id: organizerId,
        userId: actorId,
        displayName: "Alex",
      },
    ]);
  });

  it("rejects creation when surface composition is invalid", async () => {
    const context = createTripsService();

    await expect(
      context.service.create(
        createTripDto({
          asphaltPercent: 60,
          unpavedPercent: 30,
        }),
        createActor()
      )
    ).rejects.toThrow(BadRequestException);
    expect(context.trips).toHaveLength(0);
  });

  it("rejects creation for unknown cities", async () => {
    const context = createTripsService({ cities: [] });

    await expect(context.service.create(createTripDto(), createActor())).rejects.toThrow(
      BadRequestException
    );
    expect(context.trips).toHaveLength(0);
  });

  it("stages moderated fields from an upcoming published trip", async () => {
    const context = createTripsService({
      trips: [createTrip({ status: "published" })],
      organizers: [createOrganizer()],
      users: [createUser()],
    });

    const trip = await context.service.update(
      tripId,
      {
        title: "Новое название",
        asphaltPercent: 80,
        unpavedPercent: 20,
      },
      { id: actorId, role: "user" }
    );

    expect(trip).toMatchObject({
      title: "Лесной маршрут",
      publicSlug: "lesnoy-marshrut",
      asphaltPercent: 80,
      unpavedPercent: 20,
      moderationStatus: "pending_review",
      pendingRevision: { title: "Новое название" },
    });
    expect(context.tripUpdates).toMatchObject([
      {
        tripId,
        title: "Детали поездки обновлены",
      },
    ]);
    expect(context.notifications.enqueueTripUpdatedNotification).toHaveBeenCalledWith(trip);
    expect(context.notifications.enqueueModerationSubmitted).toHaveBeenCalledWith(trip);
  });

  it("rejects updates from users who do not own the trip", async () => {
    const context = createTripsService({
      trips: [createTrip()],
      organizers: [createOrganizer()],
      users: [createUser()],
    });

    await expect(
      context.service.update(
        tripId,
        { title: "Чужая правка" },
        { id: "someone-else", role: "user" }
      )
    ).rejects.toThrow(ForbiddenException);
  });

  it("rejects updates for trips that already started", async () => {
    const context = createTripsService({
      trips: [createTrip({ startAt: new Date("2020-01-01T08:00:00.000Z") })],
      organizers: [createOrganizer()],
      users: [createUser()],
    });

    await expect(
      context.service.update(tripId, { title: "Поздно" }, { id: actorId, role: "user" })
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects updates for cancelled and finished trips", async () => {
    for (const status of ["cancelled", "finished"] as const) {
      const context = createTripsService({
        trips: [createTrip({ status })],
        organizers: [createOrganizer()],
        users: [createUser()],
      });

      await expect(
        context.service.update(tripId, { title: "Нельзя менять" }, { id: actorId, role: "user" })
      ).rejects.toThrow(BadRequestException);
      expect(context.tripUpdates).toHaveLength(0);
      expect(context.notifications.enqueueTripUpdatedNotification).not.toHaveBeenCalled();
    }
  });

  it("rejects updates that break surface composition", async () => {
    const context = createTripsService({
      trips: [createTrip({ asphaltPercent: 70, unpavedPercent: 30 })],
      organizers: [createOrganizer()],
      users: [createUser()],
    });

    await expect(
      context.service.update(tripId, { asphaltPercent: 80 }, { id: actorId, role: "user" })
    ).rejects.toThrow(BadRequestException);

    expect(context.trips[0]).toMatchObject({
      asphaltPercent: 70,
      unpavedPercent: 30,
    });
    expect(context.tripUpdates).toHaveLength(0);
  });

  it("updates drafts without emitting participant notifications", async () => {
    const context = createTripsService({
      trips: [createTrip({ status: "draft" })],
      organizers: [createOrganizer()],
      users: [createUser()],
    });

    const trip = await context.service.update(
      tripId,
      { routeDescription: "Черновик уточнён" },
      { id: actorId, role: "user" }
    );

    expect(trip.routeDescription).toBe("Черновик уточнён");
    expect(context.tripUpdates).toHaveLength(0);
    expect(context.notifications.enqueueTripUpdatedNotification).not.toHaveBeenCalled();
  });

  it("does not allow administrators to edit trips owned by another organizer", async () => {
    const context = createTripsService({
      trips: [createTrip()],
      organizers: [createOrganizer()],
      users: [createUser()],
    });

    await expect(context.service.update(
      tripId,
      { title: "Админская правка" },
      { id: "admin-user", role: "admin" }
    )).rejects.toThrow(ForbiddenException);
  });

  it("publishes a trip and records a status update", async () => {
    const context = createTripsService({
      trips: [createTrip({ status: "draft" })],
      organizers: [createOrganizer()],
      users: [createUser()],
    });

    const trip = await context.service.transition(tripId, "published", {
      id: "admin-user",
      role: "admin",
    });

    expect(trip.status).toBe("published");
    expect(context.tripUpdates).toMatchObject([
      {
        tripId,
        title: "Поездка опубликована",
      },
    ]);
    expect(context.notifications.enqueueTripStatusNotification).toHaveBeenCalledWith(
      trip,
      "published"
    );
  });

  it("hides an unpublished trip from everyone except its organizer and administrators", async () => {
    const context = createTripsService({
      trips: [createTrip({ status: "draft", moderationStatus: "draft" })],
      organizers: [createOrganizer()],
      users: [createUser()],
    });

    await expect(
      context.service.getVisibleBySlugOrId(tripId, { id: "another-user", role: "user" }),
    ).rejects.toThrow(NotFoundException);
    await expect(
      context.service.getVisibleBySlugOrId(tripId, { id: actorId, role: "user" }),
    ).resolves.toMatchObject({ trip: { id: tripId } });
    await expect(
      context.service.getVisibleBySlugOrId(tripId, { id: "admin-user", role: "admin" }),
    ).resolves.toMatchObject({ trip: { id: tripId } });
  });

  it("submits and withdraws a new trip review", async () => {
    const context = createTripsService({
      trips: [createTrip({ status: "draft", moderationStatus: "draft" })],
      organizers: [createOrganizer()],
      users: [createUser()],
    });

    const submitted = await context.service.submitForReview(tripId, {
      id: actorId,
      role: "user",
    });
    expect(submitted).toMatchObject({
      status: "pending_review",
      moderationStatus: "pending_review",
    });
    expect(context.notifications.enqueueModerationSubmitted).toHaveBeenCalledWith(submitted);

    const withdrawn = await context.service.withdrawReview(tripId, {
      id: actorId,
      role: "user",
    });
    expect(withdrawn).toMatchObject({ status: "draft", moderationStatus: "draft" });
  });

  it("requires a comment when returning or rejecting a trip", async () => {
    const context = createTripsService({
      trips: [createTrip({ status: "pending_review", moderationStatus: "pending_review" })],
      organizers: [createOrganizer()],
      users: [createUser()],
    });

    await expect(
      context.service.moderate(
        tripId,
        "request_changes",
        " ",
        { id: "admin-user", role: "admin" },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("publishes an approved trip and permanently closes a rejected trip", async () => {
    const approvedContext = createTripsService({
      trips: [createTrip({ status: "pending_review", moderationStatus: "pending_review" })],
      organizers: [createOrganizer()],
      users: [createUser()],
    });
    const approved = await approvedContext.service.moderate(
      tripId,
      "approve",
      undefined,
      { id: "admin-user", role: "admin" },
    );
    expect(approved).toMatchObject({ status: "published", moderationStatus: "approved" });

    const rejectedContext = createTripsService({
      trips: [createTrip({ status: "pending_review", moderationStatus: "pending_review" })],
      organizers: [createOrganizer()],
      users: [createUser()],
    });
    const rejected = await rejectedContext.service.moderate(
      tripId,
      "reject",
      "Недостаточно информации",
      { id: "admin-user", role: "admin" },
    );
    expect(rejected).toMatchObject({
      status: "rejected",
      moderationStatus: "rejected",
      moderationComment: "Недостаточно информации",
    });
    await expect(
      rejectedContext.service.update(tripId, { title: "Исправление" }, {
        id: actorId,
        role: "user",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("cancels an upcoming active trip and records a status update", async () => {
    const context = createTripsService({
      trips: [createTrip({ status: "published" })],
      organizers: [createOrganizer()],
      users: [createUser()],
    });

    const trip = await context.service.transition(tripId, "cancelled", {
      id: actorId,
      role: "user",
    });

    expect(trip.status).toBe("cancelled");
    expect(context.tripUpdates).toMatchObject([
      {
        tripId,
        title: "Поездка отменена",
        body: "Организатор отменил поездку.",
      },
    ]);
    expect(context.notifications.enqueueTripStatusNotification).toHaveBeenCalledWith(
      trip,
      "cancelled"
    );
  });

  it("rejects status transitions from users who do not own the trip", async () => {
    const context = createTripsService({
      trips: [createTrip({ status: "published" })],
      organizers: [createOrganizer()],
      users: [createUser()],
    });

    await expect(
      context.service.transition(tripId, "cancelled", {
        id: "someone-else",
        role: "user",
      })
    ).rejects.toThrow(ForbiddenException);

    expect(context.trips[0]?.status).toBe("published");
    expect(context.tripUpdates).toHaveLength(0);
    expect(context.notifications.enqueueTripStatusNotification).not.toHaveBeenCalled();
  });

  it("rejects cancelling trips that are already cancelled or finished", async () => {
    for (const status of ["cancelled", "finished"] as const) {
      const context = createTripsService({
        trips: [createTrip({ status })],
        organizers: [createOrganizer()],
        users: [createUser()],
      });

      await expect(
        context.service.transition(tripId, "cancelled", { id: actorId, role: "user" })
      ).rejects.toThrow(BadRequestException);
      expect(context.tripUpdates).toHaveLength(0);
      expect(context.notifications.enqueueTripStatusNotification).not.toHaveBeenCalled();
    }
  });

  it("rejects cancelling a past trip", async () => {
    const context = createTripsService({
      trips: [createTrip({ startAt: new Date("2020-01-01T08:00:00.000Z") })],
      organizers: [createOrganizer()],
      users: [createUser()],
    });

    await expect(
      context.service.transition(tripId, "cancelled", { id: actorId, role: "user" })
    ).rejects.toThrow(BadRequestException);
  });

  it("finishes a trip without emitting participant notifications", async () => {
    const context = createTripsService({
      trips: [createTrip({ status: "published" })],
      organizers: [createOrganizer()],
      users: [createUser()],
    });

    const trip = await context.service.transition(tripId, "finished", {
      id: actorId,
      role: "user",
    });

    expect(trip.status).toBe("finished");
    expect(context.tripUpdates).toHaveLength(0);
    expect(context.notifications.enqueueTripStatusNotification).not.toHaveBeenCalled();
  });

  it("throws not found for unknown trip references", async () => {
    const context = createTripsService();

    await expect(context.service.getBySlugOrId("missing-trip")).rejects.toThrow(NotFoundException);
  });

  it("rejects route files that are not valid GPX uploads before creating a trip", async () => {
    const context = createTripsService();

    await expect(
      context.service.createWithRouteFile(
        createTripDto(),
        {
          originalname: "route.txt",
          mimetype: "text/plain",
          size: 5,
          buffer: Buffer.from("hello"),
        },
        undefined,
        createActor()
      )
    ).rejects.toThrow(BadRequestException);
    expect(context.trips).toHaveLength(0);
  });

  it("rejects invalid cover image uploads before creating a trip", async () => {
    const context = createTripsService();

    await expect(
      context.service.createWithRouteFile(
        createTripDto(),
        undefined,
        {
          originalname: "cover.gif",
          mimetype: "image/gif",
          size: 10,
          buffer: Buffer.from("not an image"),
        },
        createActor()
      )
    ).rejects.toThrow(BadRequestException);
    expect(context.trips).toHaveLength(0);
  });

  it("downloads a published trip route file from storage", async () => {
    const storageKey = `${tripId}/download-route.gpx`;
    const context = createTripsService({
      trips: [
        createTrip({
          status: "published",
          routeFiles: [
            createRouteFile({
              originalName: "маршрут.gpx",
              storageKey,
              contentType: "application/gpx+xml",
            }),
          ],
        }),
      ],
      organizers: [createOrganizer()],
      users: [createUser()],
    });
    await writeStorageFile(routeFilesDirectory, storageKey, "<gpx></gpx>");

    const download = await context.service.getRouteFileForDownload(tripId);

    expect(download).toEqual({
      fileName: "маршрут.gpx",
      contentType: "application/gpx+xml",
      content: Buffer.from("<gpx></gpx>"),
    });
  });

  it("hides route files for draft trips", async () => {
    const context = createTripsService({
      trips: [
        createTrip({
          status: "draft",
          routeFiles: [createRouteFile()],
        }),
      ],
      organizers: [createOrganizer()],
      users: [createUser()],
    });

    await expect(context.service.getRouteFileForDownload(tripId)).rejects.toThrow(
      NotFoundException
    );
  });

  it("downloads an uploaded cover image from storage", async () => {
    const context = createTripsService({
      trips: [
        createTrip({
          coverImage: `/trips/${tripId}/cover-image?v=123`,
        }),
      ],
      organizers: [createOrganizer()],
      users: [createUser()],
    });
    await writeStorageFile(coverImagesDirectory, `${tripId}/123-cover.webp`, "cover");

    const download = await context.service.getCoverImageForDownload(tripId);

    expect(download).toEqual({
      contentType: "image/webp",
      content: Buffer.from("cover"),
    });
  });

  it("removes stored route files when updating with removeRouteFile", async () => {
    const storageKey = `${tripId}/old-route.gpx`;
    const context = createTripsService({
      trips: [createTrip({ routeFiles: [createRouteFile({ storageKey })] })],
      routeFiles: [createRouteFile({ storageKey })],
      organizers: [createOrganizer()],
      users: [createUser()],
    });
    await writeStorageFile(routeFilesDirectory, storageKey, "<gpx></gpx>");

    await context.service.updateWithRouteFile(
      tripId,
      { routeDescription: "Маршрут удалён" },
      undefined,
      undefined,
      true,
      { id: actorId, role: "user" }
    );

    expect(context.routeFiles).toHaveLength(0);
    await expect(readFile(path.join(routeFilesDirectory, storageKey))).rejects.toThrow();
  });
});

function createTripsService(
  input: {
    trips?: TestTrip[];
    tripUpdates?: TestTripUpdate[];
    organizers?: TestOrganizer[];
    users?: TestUser[];
    cities?: TestCity[];
    routeFiles?: TestRouteFile[];
    existingSlugs?: string[];
  } = {}
) {
  const trips = input.trips ?? [];
  const tripUpdates = input.tripUpdates ?? [];
  const organizers = input.organizers ?? [];
  const users = input.users ?? [];
  const cities = input.cities ?? [createCity()];
  const routeFiles = input.routeFiles ?? [];
  const existingSlugs = input.existingSlugs ?? [];
  const queryBuilder = createQueryBuilder();
  const notifications = {
    enqueueTripUpdatedNotification: vi.fn().mockResolvedValue(undefined),
    enqueueTripStatusNotification: vi.fn().mockResolvedValue(undefined),
    enqueueModerationSubmitted: vi.fn().mockResolvedValue(undefined),
    enqueueModerationDecision: vi.fn().mockResolvedValue(undefined),
  };
  const tripsRepository = {
    createQueryBuilder: vi.fn(() => queryBuilder),
    findOne: vi.fn(({ where }: { where: { id?: string; publicSlug?: string } }) =>
      Promise.resolve(
        trips.find((trip) =>
          where.id !== undefined ? trip.id === where.id : trip.publicSlug === where.publicSlug
        ) ?? null
      )
    ),
    create: vi.fn((trip: Partial<TestTrip>) => createTrip(trip)),
    save: vi.fn(async (trip: TestTrip) => {
      const existingIndex = trips.findIndex((item) => item.id === trip.id);
      if (existingIndex >= 0) {
        trips[existingIndex] = trip;
      } else {
        trips.push(trip);
      }
      return trip;
    }),
    exists: vi.fn(({ where }: { where: { publicSlug: string } }) =>
      Promise.resolve(
        existingSlugs.includes(where.publicSlug) ||
          trips.some((trip) => trip.publicSlug === where.publicSlug)
      )
    ),
    update: vi.fn(async (where: { id: string }, patch: Partial<TestTrip>) => {
      const trip = trips.find((item) => item.id === where.id);
      if (trip) Object.assign(trip, patch);
    }),
  };
  const tripUpdatesRepository = {
    create: vi.fn((update: Partial<TestTripUpdate>) => createTripUpdate(update)),
    save: vi.fn(async (update: TestTripUpdate) => {
      tripUpdates.push(update);
      return update;
    }),
  };
  const organizersRepository = {
    findOne: vi.fn(({ where }: { where: { userId: string } }) =>
      Promise.resolve(organizers.find((organizer) => organizer.userId === where.userId) ?? null)
    ),
    create: vi.fn((organizer: Partial<TestOrganizer>) => createOrganizer(organizer)),
    save: vi.fn(async (organizer: TestOrganizer) => {
      organizers.push(organizer);
      return organizer;
    }),
  };
  const usersRepository = {
    findOne: vi.fn(({ where }: { where: { id: string } }) =>
      Promise.resolve(users.find((user) => user.id === where.id) ?? null)
    ),
    create: vi.fn((user: Partial<TestUser>) => createUser(user)),
    save: vi.fn(async (user: TestUser) => {
      users.push(user);
      return user;
    }),
  };
  const citiesRepository = {
    existsBy: vi.fn(({ id }: { id: string }) =>
      Promise.resolve(cities.some((city) => city.id === id))
    ),
  };
  const routeFilesRepository = {
    find: vi.fn(({ where }: { where: { tripId: string } }) =>
      Promise.resolve(routeFiles.filter((routeFile) => routeFile.tripId === where.tripId))
    ),
    create: vi.fn((routeFile: Partial<TestRouteFile>) => createRouteFile(routeFile)),
    save: vi.fn(async (routeFile: TestRouteFile) => {
      routeFiles.push(routeFile);
      return routeFile;
    }),
    delete: vi.fn(async (where: { tripId: string }) => {
      for (let index = routeFiles.length - 1; index >= 0; index -= 1) {
        if (routeFiles[index]?.tripId === where.tripId) routeFiles.splice(index, 1);
      }
    }),
  };

  return {
    service: new TripsService(
      tripsRepository as never,
      tripUpdatesRepository as never,
      organizersRepository as never,
      usersRepository as never,
      citiesRepository as never,
      routeFilesRepository as never,
      notifications as never
    ),
    trips,
    tripUpdates,
    organizers,
    users,
    cities,
    routeFiles,
    queryBuilder,
    notifications,
  };
}

function createQueryBuilder() {
  const queryBuilder = {
    leftJoinAndSelect: vi.fn(() => queryBuilder),
    orderBy: vi.fn(() => queryBuilder),
    andWhere: vi.fn(() => queryBuilder),
    getMany: vi.fn(() => Promise.resolve([])),
  };

  return queryBuilder;
}

function createTripDto(input: Partial<CreateTripDto> = {}): CreateTripDto {
  return {
    title: "Лесной маршрут",
    description: "Поездка по лесным дорогам",
    startAt: futureStart,
    startLocationName: "Парк",
    startLat: 55.755864,
    startLng: 37.617698,
    distanceKm: 42,
    paceMin: 18,
    paceMax: 22,
    difficulty: "medium",
    bikeType: "gravel",
    asphaltPercent: 70,
    unpavedPercent: 30,
    unpavedSurfaceDetails: ["hardpack"],
    dropPolicy: "no_drop",
    routeDescription: "Круговой маршрут",
    equipmentRequirements: "Шлем",
    rules: "Безопасно едем группой",
    maxParticipants: 10,
    registrationMode: "automatic",
    organizerId,
    cityId,
    ...input,
  };
}

function createActor() {
  return {
    id: actorId,
    name: "Alex",
    role: "user" as const,
    phoneVerified: true,
  };
}

function createTrip(input: Partial<TestTrip> = {}): TestTrip {
  const organizer = input.organizer ?? createOrganizer();

  return {
    id: tripId,
    title: "Лесной маршрут",
    description: "Поездка по лесным дорогам",
    startAt: new Date(futureStart),
    startLocationName: "Парк",
    startLat: "55.755864",
    startLng: "37.617698",
    distanceKm: "42",
    paceMin: 18,
    paceMax: 22,
    difficulty: "medium",
    bikeType: "gravel",
    asphaltPercent: 70,
    unpavedPercent: 30,
    unpavedSurfaceDetails: ["hardpack"],
    dropPolicy: "no_drop",
    routeDescription: "Круговой маршрут",
    equipmentRequirements: "Шлем",
    rules: "Безопасно едем группой",
    maxParticipants: 10,
    registrationMode: "automatic",
    coverImage: null,
    status: "published",
    publicSlug: "lesnoy-marshrut",
    organizer,
    organizerId: organizer.id,
    city: createCity(),
    cityId,
    participants: [],
    waitlistEntries: [],
    updates: [],
    routeFiles: [],
    createdAt: new Date("2026-08-16T08:00:00.000Z"),
    updatedAt: new Date("2026-08-16T08:00:00.000Z"),
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

function createOrganizer(input: Partial<TestOrganizer> = {}): TestOrganizer {
  return {
    id: organizerId,
    displayName: "Alex",
    bio: null,
    contactUrl: null,
    isVerified: false,
    userId: actorId,
    user: createUser(),
    trips: [],
    createdAt: new Date("2026-08-16T08:00:00.000Z"),
    updatedAt: new Date("2026-08-16T08:00:00.000Z"),
    ...input,
  };
}

function createUser(input: Partial<TestUser> = {}): TestUser {
  return {
    id: actorId,
    name: "Alex",
    email: null,
    emailVerifiedAt: null,
    role: "user",
    phoneNumber: null,
    phoneVerifiedAt: null,
    avatarUrl: null,
    cityId: null,
    city: null,
    createdAt: new Date("2026-08-16T08:00:00.000Z"),
    updatedAt: new Date("2026-08-16T08:00:00.000Z"),
    organizerProfiles: [],
    telegramAccounts: [],
    tripParticipants: [],
    ...input,
  };
}

function createCity(input: Partial<TestCity> = {}): TestCity {
  return {
    id: cityId,
    name: "Москва",
    slug: "moscow",
    timezone: "Europe/Moscow",
    centerLat: "55.755864",
    centerLng: "37.617698",
    trips: [],
    ...input,
  };
}

function createTripUpdate(input: Partial<TestTripUpdate> = {}): TestTripUpdate {
  return {
    id: "trip-update-1",
    tripId,
    trip: createTrip(),
    title: "Поездка обновлена",
    body: "Детали изменились",
    createdAt: new Date("2026-08-16T08:00:00.000Z"),
    ...input,
  };
}

function createRouteFile(input: Partial<TestRouteFile> = {}): TestRouteFile {
  return {
    id: "route-file-1",
    tripId,
    trip: createTrip(),
    originalName: "route.gpx",
    contentType: "application/gpx+xml",
    storageKey: `${tripId}/route.gpx`,
    createdAt: new Date("2026-08-16T08:00:00.000Z"),
    ...input,
  };
}

async function writeStorageFile(rootDirectory: string, storageKey: string, content: string) {
  const filePath = path.join(rootDirectory, storageKey);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
}

type TestTrip = TripEntity;
type TestTripUpdate = TripUpdateEntity;
type TestOrganizer = OrganizerEntity;
type TestUser = UserEntity;
type TestCity = CityEntity;
type TestRouteFile = RouteFileEntity;
