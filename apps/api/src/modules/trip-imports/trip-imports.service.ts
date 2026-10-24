import { createHash } from "node:crypto";

import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { ImportRunResult, ImportSourceSummary } from "@biketrips/domain";
import { Repository } from "typeorm";

import { ImportSourceEntity } from "../../infrastructure/database/entities/import-source.entity.js";
import { ImportedPostEntity } from "../../infrastructure/database/entities/imported-post.entity.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { TripsService, type ImportedTripFields } from "../trips/trips.service.js";
import type { TelegramChannelPost } from "./telegram-channel-preview.js";
import { TripImportGateway } from "./trip-import.gateway.js";
import {
  buildTripDraft,
  type DraftCheck,
  type PostExtraction,
  type PostKind,
} from "./trip-post-extraction.js";

// The channel posts 5-10 announcements a day; 40 posts cover several days between runs.
const postsPerRun = 40;
const recentPostsInSummary = 50;

const skipReasons: Record<Exclude<PostKind, "single_trip">, string> = {
  digest: "Список поездок",
  multi_day_tour: "Многодневный тур",
  cancellation: "Отмена поездки",
  not_cycling: "Не велопоездка",
  other: "Не анонс поездки",
};

const unknownFieldLabels: Record<string, string> = {
  distanceKm: "дистанция",
  difficulty: "сложность",
  asphaltPercent: "покрытие",
};

type PostOutcome = keyof ImportRunResult;

@Injectable()
export class TripImportsService {
  constructor(
    @InjectRepository(ImportSourceEntity)
    private readonly sourcesRepository: Repository<ImportSourceEntity>,
    @InjectRepository(ImportedPostEntity)
    private readonly postsRepository: Repository<ImportedPostEntity>,
    @Inject(TripsService)
    private readonly tripsService: TripsService,
    @Inject(TripImportGateway)
    private readonly gateway: TripImportGateway,
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService,
  ) {}

  async runEnabledSources(): Promise<ImportRunResult> {
    const sources = await this.sourcesRepository.find({ where: { enabled: true } });
    const total = emptyResult();
    for (const source of sources) {
      const result = await this.runSource(source);
      for (const key of Object.keys(total) as PostOutcome[]) total[key] += result[key];
    }
    return total;
  }

  async runSourceById(id: string): Promise<ImportRunResult> {
    const source = await this.sourcesRepository.findOne({ where: { id } });
    if (!source) throw new NotFoundException("Import source not found");
    return this.runSource(source);
  }

  async runSource(source: ImportSourceEntity): Promise<ImportRunResult> {
    const result = emptyResult();
    try {
      const posts = await this.gateway.fetchPosts(source.handle, postsPerRun);
      // Oldest first, so a cancellation edit is applied after the trip it cancels exists.
      for (const post of [...posts].sort((a, b) => a.messageId - b.messageId)) {
        result[await this.importPost(source, post)] += 1;
      }
      source.lastError = null;
    } catch (error) {
      source.lastError = describeError(error);
      console.error(`[BikeTrips] Import from @${source.handle} failed`, error);
    }
    source.lastRunAt = new Date();
    await this.sourcesRepository.save(source);
    try {
      await this.notificationsService.enqueueImportSummary(source.handle, result);
    } catch (error) {
      // The import itself succeeded; a missed summary only delays the moderators.
      console.error(`[BikeTrips] Could not queue the import summary for @${source.handle}`, error);
    }
    return result;
  }

  async listSources(): Promise<ImportSourceSummary[]> {
    const sources = await this.sourcesRepository.find({
      relations: { city: true },
      order: { handle: "ASC" },
    });
    return Promise.all(
      sources.map(async (source) => {
        const posts = await this.postsRepository.find({
          where: { sourceId: source.id },
          relations: { trip: true },
          order: { postedAt: "DESC" },
          take: recentPostsInSummary,
        });
        return {
          id: source.id,
          handle: source.handle,
          title: source.title,
          city: source.city.name,
          enabled: source.enabled,
          lastRunAt: source.lastRunAt?.toISOString() ?? null,
          lastError: source.lastError,
          recentPosts: posts.map((post) => ({
            id: post.id,
            messageId: post.messageId,
            url: post.url,
            postedAt: post.postedAt.toISOString(),
            excerpt: excerptOf(post.text),
            kind: post.kind,
            status: post.status,
            skipReason: post.skipReason,
            tripId: post.tripId,
            tripSlug: post.trip?.publicSlug ?? null,
            tripTitle: post.trip?.title ?? null,
            extractedAt: post.extractedAt?.toISOString() ?? null,
          })),
        };
      }),
    );
  }

  private async importPost(
    source: ImportSourceEntity,
    post: TelegramChannelPost,
  ): Promise<PostOutcome> {
    const textHash = hashText(post.text);
    const record =
      (await this.postsRepository.findOne({
        where: { sourceId: source.id, messageId: post.messageId },
      })) ??
      this.postsRepository.create({
        sourceId: source.id,
        messageId: post.messageId,
        tripId: null,
      });

    // Unchanged posts cost nothing: the model only sees new and edited posts.
    if (record.id && record.textHash === textHash && record.status !== "error") {
      return "unchanged";
    }

    Object.assign(record, {
      url: post.url,
      postedAt: new Date(post.postedAt),
      text: post.text,
      coverUrl: post.coverUrl,
    });

    if (!post.text.trim()) {
      return this.finish(record, textHash, { status: "skipped", skipReason: "Пост без текста" });
    }

    let extraction: PostExtraction | null;
    try {
      extraction = (await this.gateway.extract(post)).extraction;
    } catch (error) {
      // The hash is left as it was, so the post is retried on the next run.
      return this.finish(record, record.textHash ?? "", {
        status: "error",
        skipReason: describeError(error),
      });
    }
    if (!extraction) {
      return this.finish(record, record.textHash ?? "", {
        status: "error",
        skipReason: "Модель не вернула результат",
      });
    }

    record.kind = extraction.kind;
    record.extraction = extraction as unknown as Record<string, unknown>;
    record.extractedAt = new Date();

    if (record.tripId) {
      return this.applyEditedPost(record, textHash, post, extraction);
    }

    if (extraction.kind !== "single_trip" || !extraction.trip) {
      const skipReason =
        extraction.kind === "single_trip" ? "Нет данных поездки" : skipReasons[extraction.kind];
      return this.finish(record, textHash, { status: "skipped", skipReason });
    }

    const check = buildTripDraft(post, extraction.trip);
    const fields = toImportedTripFields(check);
    if (!fields) {
      return this.finish(record, textHash, {
        status: "skipped",
        skipReason: "Не указаны дата, время или место старта",
      });
    }
    if (fields.startAt.getTime() <= Date.now()) {
      return this.finish(record, textHash, { status: "skipped", skipReason: "Поездка уже прошла" });
    }

    const trip = await this.tripsService.createImported(fields, {
      organizerId: source.organizerId,
      cityId: source.cityId,
      moderationComment: buildModerationNote(source, extraction, check),
    });
    await this.attachCover(trip.id, post.coverUrl);
    record.tripId = trip.id;
    return this.finish(record, textHash, { status: "imported", skipReason: null }, "created");
  }

  /** The post behind an imported trip was edited: cancel it or pass the changes on. */
  private async applyEditedPost(
    record: ImportedPostEntity,
    textHash: string,
    post: TelegramChannelPost,
    extraction: PostExtraction,
  ): Promise<PostOutcome> {
    const tripId = record.tripId as string;

    if (extraction.kind === "cancellation") {
      const cancelled = await this.tripsService.cancelImported(tripId);
      return this.finish(
        record,
        textHash,
        { status: "imported", skipReason: cancelled ? "Отменена в канале" : null },
        cancelled ? "cancelled" : "unchanged",
      );
    }

    const fields =
      extraction.kind === "single_trip" && extraction.trip
        ? toImportedTripFields(buildTripDraft(post, extraction.trip))
        : null;
    if (!fields) {
      // An edit that no longer reads as a ride is left for the moderator to notice.
      return this.finish(
        record,
        textHash,
        { status: "imported", skipReason: "Пост изменён и больше не похож на анонс" },
        "unchanged",
      );
    }

    const check = buildTripDraft(post, extraction.trip!);
    const source = await this.sourcesRepository.findOneOrFail({ where: { id: record.sourceId } });
    const outcome = await this.tripsService.updateImported(
      tripId,
      fields,
      `Пост в канале изменён. ${buildModerationNote(source, extraction, check)}`,
    );
    return this.finish(
      record,
      textHash,
      { status: "imported", skipReason: null },
      outcome === "updated" || outcome === "revision" ? "updated" : "unchanged",
    );
  }

  private async attachCover(tripId: string, coverUrl: string | null): Promise<void> {
    if (!coverUrl) return;
    try {
      const image = await this.gateway.downloadImage(coverUrl);
      if (!image) return;
      await this.tripsService.setImportedCoverImage(tripId, {
        originalname: "telegram-cover",
        mimetype: image.contentType,
        size: image.buffer.byteLength,
        buffer: image.buffer,
      });
    } catch (error) {
      // A trip without a cover is still worth reviewing.
      console.warn(`[BikeTrips] Could not import cover for trip ${tripId}`, error);
    }
  }

  private async finish(
    record: ImportedPostEntity,
    textHash: string,
    state: Pick<ImportedPostEntity, "status" | "skipReason">,
    outcome?: PostOutcome,
  ): Promise<PostOutcome> {
    Object.assign(record, state, { textHash });
    await this.postsRepository.save(record);
    if (outcome) return outcome;
    return state.status === "error" ? "errors" : state.status === "skipped" ? "skipped" : "updated";
  }
}

function emptyResult(): ImportRunResult {
  return { created: 0, updated: 0, cancelled: 0, skipped: 0, unchanged: 0, errors: 0 };
}

/** The first line of a post without the link targets the preview parser appends. */
function excerptOf(text: string): string {
  const firstLine = text.split("\n").find((line) => line.trim()) ?? "";
  return firstLine
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<\/?[bius]>/g, "")
    .replace(/\s*\[(?:https?:\/\/|\?q=)[^\]]*\]/g, "")
    .trim()
    .slice(0, 120);
}

function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function toImportedTripFields({ draft, missingRequired }: DraftCheck): ImportedTripFields | null {
  if (missingRequired.length > 0 || !draft.startAt || !draft.startLocationName) return null;
  return {
    title: draft.title,
    description: draft.description,
    startAt: new Date(draft.startAt),
    startLocationName: draft.startLocationName,
    startLat: draft.startLat,
    startLng: draft.startLng,
    distanceKm: draft.distanceKm !== null && draft.distanceKm >= 1 ? draft.distanceKm : null,
    paceMin: positiveOrNull(draft.paceMin),
    paceMax: positiveOrNull(draft.paceMax),
    difficulty: draft.difficulty,
    asphaltPercent: draft.asphaltPercent,
    unpavedPercent: draft.unpavedPercent,
    unpavedSurfaceDetails: draft.unpavedSurfaceDetails,
    routeDescription: draft.routeDescription,
    equipmentRequirements: draft.equipmentRequirements,
    rules: draft.rules,
    sourceUrl: draft.sourceUrl,
    externalRegistrationUrl: draft.externalRegistrationUrl,
  };
}

function positiveOrNull(value: number | null): number | null {
  return value !== null && value >= 1 ? value : null;
}

/** What the moderator should double-check, shown in the moderation queue. */
export function buildModerationNote(
  source: Pick<ImportSourceEntity, "handle">,
  extraction: PostExtraction,
  { unknownFields, warnings }: DraftCheck,
): string {
  const lines = [`Импорт из @${source.handle}, уверенность модели: ${extraction.confidence}.`];
  if (unknownFields.length > 0) {
    lines.push(`Не указано: ${unknownFields.map((field) => unknownFieldLabels[field] ?? field).join(", ")}.`);
  }
  lines.push(...warnings.map((warning) => `${warning}.`));
  if (extraction.notes) lines.push(`Заметки: ${extraction.notes}`);
  return lines.join("\n");
}
