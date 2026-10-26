import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";
import type { Repository } from "typeorm";

import type { ImportSourceEntity } from "../../infrastructure/database/entities/import-source.entity.js";
import type { ImportedPostEntity } from "../../infrastructure/database/entities/imported-post.entity.js";
import type { NotificationsService } from "../notifications/notifications.service.js";
import type { ImportedOrganizersService } from "../organizers/imported-organizers.service.js";
import type { TripsService } from "../trips/trips.service.js";
import type { TelegramChannelPost } from "./telegram-channel-preview.js";
import type { TripImportGateway } from "./trip-import.gateway.js";
import type { ExtractedTrip, PostExtraction } from "./trip-post-extraction.js";
import { TripImportsService } from "./trip-imports.service.js";

const source = {
  id: "source-1",
  handle: "MskVelo",
  organizerId: "organizer-1",
  cityId: "city-1",
  enabled: true,
  lastRunAt: null,
  lastError: null,
} as ImportSourceEntity;

function createPost(input: Partial<TelegramChannelPost> = {}): TelegramChannelPost {
  return {
    channel: "MskVelo",
    messageId: 19663,
    url: "https://t.me/MskVelo/19663",
    postedAt: "2099-10-20T04:54:41.000Z",
    edited: false,
    text: "21 октября. Докатиста. 35 км",
    hasMedia: true,
    coverUrl: "https://cdn4.telesco.pe/file/cover.jpg",
    authorSignature: null,
    forwardedFrom: null,
    ...input,
  };
}

const trip: ExtractedTrip = {
  title: "Докатиста",
  startDate: "2099-10-21",
  startTime: "19:45",
  endDate: null,
  startLocationName: "МЦК Коптево",
  startLat: null,
  startLng: null,
  finishLocationName: null,
  distanceKm: null,
  paceMinKmh: 16,
  paceMaxKmh: 16,
  asphaltPercent: null,
  unpavedPercent: null,
  unpavedSurfaceDetails: [],
  difficulty: null,
  difficultyIsGuess: false,
  isPaid: false,
  priceText: null,
  minAge: 18,
  clubName: "Vel Chill",
  leaderUsernames: ["AndreyEP"],
  leaderName: null,
  registrationUrl: "https://t.me/AndreyEP",
  routeUrl: null,
  routeDescription: null,
  equipmentRequirements: null,
  rules: null,
};

function extraction(input: Partial<PostExtraction> = {}): PostExtraction {
  return {
    kind: "single_trip",
    kindReason: "Анонс одной поездки",
    trip,
    confidence: "high",
    notes: null,
    ...input,
  };
}

function setup(options: { existing?: Partial<ImportedPostEntity>; result?: PostExtraction | null } = {}) {
  const saved: ImportedPostEntity[] = [];
  const postsRepository = {
    findOne: vi.fn().mockResolvedValue(options.existing ?? null),
    create: vi.fn((input: Partial<ImportedPostEntity>) => ({ ...input })),
    save: vi.fn(async (record: ImportedPostEntity) => {
      saved.push({ ...record });
      return record;
    }),
  };
  const sourcesRepository = {
    find: vi.fn().mockResolvedValue([source]),
    findOneOrFail: vi.fn().mockResolvedValue(source),
    save: vi.fn(async (value: ImportSourceEntity) => value),
  };
  const tripsService = {
    createImported: vi.fn().mockResolvedValue({ id: "trip-1" }),
    updateImported: vi.fn().mockResolvedValue("revision"),
    cancelImported: vi.fn().mockResolvedValue(true),
    setImportedCoverImage: vi.fn().mockResolvedValue(undefined),
  };
  const gateway = {
    fetchPosts: vi.fn().mockResolvedValue([createPost()]),
    extract: vi.fn().mockResolvedValue({
      extraction: options.result === undefined ? extraction() : options.result,
      stopReason: "end_turn",
      usage: { inputTokens: 0, outputTokens: 0 },
      model: "claude-haiku-5-5",
    }),
    downloadImage: vi.fn().mockResolvedValue({ contentType: "image/jpeg", buffer: Buffer.from("jpg") }),
  };
  const notificationsService = { enqueueImportSummary: vi.fn().mockResolvedValue(undefined) };
  const importedOrganizers = { resolve: vi.fn().mockResolvedValue("leader-organizer") };
  const service = new TripImportsService(
    sourcesRepository as unknown as Repository<ImportSourceEntity>,
    postsRepository as unknown as Repository<ImportedPostEntity>,
    tripsService as unknown as TripsService,
    gateway as unknown as TripImportGateway,
    notificationsService as unknown as NotificationsService,
    importedOrganizers as unknown as ImportedOrganizersService,
  );
  return { service, saved, tripsService, gateway, sourcesRepository, notificationsService, importedOrganizers };
}

describe("TripImportsService", () => {
  it("creates a trip under review from a new ride announcement", async () => {
    const { service, saved, tripsService } = setup();

    await expect(service.runSource(source)).resolves.toMatchObject({ created: 1 });

    const [fields, target] = tripsService.createImported.mock.calls[0]!;
    expect(fields).toMatchObject({
      title: "Докатиста",
      startAt: new Date("2099-10-21T16:45:00.000Z"),
      distanceKm: null,
      difficulty: null,
      asphaltPercent: null,
      externalRegistrationUrl: "https://t.me/AndreyEP",
      sourceUrl: "https://t.me/MskVelo/19663",
    });
    expect(target).toMatchObject({
      organizerId: "organizer-1",
      importedOrganizerId: "leader-organizer",
      cityId: "city-1",
    });
    expect(target.moderationComment).toContain("Не указано: дистанция, сложность, покрытие.");
    expect(tripsService.setImportedCoverImage).toHaveBeenCalledWith(
      "trip-1",
      expect.objectContaining({ mimetype: "image/jpeg" }),
    );
    expect(saved.at(-1)).toMatchObject({ status: "imported", tripId: "trip-1", kind: "single_trip" });
  });

  it("tells the moderators what a run brought", async () => {
    const { service, notificationsService } = setup();

    await service.runSource(source);

    expect(notificationsService.enqueueImportSummary).toHaveBeenCalledWith(
      "MskVelo",
      expect.objectContaining({ created: 1, updated: 0, cancelled: 0 }),
    );
  });

  it("skips posts that are not single rides or already took place", async () => {
    const digest = setup({ result: extraction({ kind: "digest", trip: null }) });
    await expect(digest.service.runSource(source)).resolves.toMatchObject({ skipped: 1 });
    expect(digest.saved.at(-1)).toMatchObject({ status: "skipped", skipReason: "Список поездок" });

    const past = setup({ result: extraction({ trip: { ...trip, startDate: "2020-10-21" } }) });
    await past.service.runSource(source);
    expect(past.saved.at(-1)).toMatchObject({ status: "skipped", skipReason: "Поездка уже прошла" });
    expect(past.tripsService.createImported).not.toHaveBeenCalled();
  });

  it("does not call the model for posts it has already seen", async () => {
    const textHash = createHash("sha256").update(createPost().text).digest("hex");
    const repeat = setup({ existing: { id: "post-1", status: "imported", textHash } });

    await expect(repeat.service.runSource(source)).resolves.toMatchObject({ unchanged: 1 });
    expect(repeat.gateway.extract).not.toHaveBeenCalled();
  });

  it("cancels the trip when its post is edited into a cancellation", async () => {
    const { service, tripsService } = setup({
      existing: { id: "post-1", status: "imported", textHash: "old", tripId: "trip-1" },
      result: extraction({ kind: "cancellation" }),
    });

    await expect(service.runSource(source)).resolves.toMatchObject({ cancelled: 1 });
    expect(tripsService.cancelImported).toHaveBeenCalledWith("trip-1");
    expect(tripsService.createImported).not.toHaveBeenCalled();
  });

  it("passes other edits of an imported post to the trip for review", async () => {
    const { service, tripsService } = setup({
      existing: { id: "post-1", status: "imported", textHash: "old", tripId: "trip-1" },
      result: extraction({ trip: { ...trip, startTime: "20:00" } }),
    });

    await expect(service.runSource(source)).resolves.toMatchObject({ updated: 1 });
    const [tripId, fields, note] = tripsService.updateImported.mock.calls[0]!;
    expect(tripId).toBe("trip-1");
    expect(fields.startAt).toEqual(new Date("2099-10-21T17:00:00.000Z"));
    expect(note).toMatch(/^Пост в канале изменён\./);
  });

  it("records model failures so the post is retried on the next run", async () => {
    const { service, saved, gateway, sourcesRepository } = setup();
    gateway.extract.mockRejectedValueOnce(new Error("API 529: overloaded"));

    await expect(service.runSource(source)).resolves.toMatchObject({ errors: 1 });
    expect(saved.at(-1)).toMatchObject({
      status: "error",
      skipReason: "API 529: overloaded",
      textHash: "",
    });
    expect(sourcesRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ lastError: null, lastRunAt: expect.any(Date) }),
    );
  });
});
