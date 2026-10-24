import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  difficultyLevels,
  unpavedSurfaceDetails,
  type DifficultyLevel,
  type UnpavedSurfaceDetail,
} from "@biketrips/domain";
import { z } from "zod";

import type { TelegramChannelPost } from "./telegram-channel-preview.js";

// Haiku handled the @MskVelo validation run well and costs a fraction of a cent per post.
export const defaultExtractionModel = "claude-haiku-5-5";

// Moscow has no DST, so channel times can be pinned to a fixed offset.
const moscowOffset = "+03:00";

export const postKinds = [
  "single_trip",
  "digest",
  "multi_day_tour",
  "cancellation",
  "not_cycling",
  "other",
] as const;
export type PostKind = (typeof postKinds)[number];

const nullableString = z.string().nullable();
const nullableNumber = z.number().nullable();

export const extractedTripSchema = z.object({
  title: z.string(),
  startDate: nullableString,
  startTime: nullableString,
  endDate: nullableString,
  startLocationName: nullableString,
  startLat: nullableNumber,
  startLng: nullableNumber,
  finishLocationName: nullableString,
  distanceKm: nullableNumber,
  paceMinKmh: nullableNumber,
  paceMaxKmh: nullableNumber,
  asphaltPercent: nullableNumber,
  unpavedPercent: nullableNumber,
  unpavedSurfaceDetails: z.array(z.enum(unpavedSurfaceDetails)),
  difficulty: z.enum(difficultyLevels).nullable(),
  difficultyIsGuess: z.boolean(),
  isPaid: z.boolean(),
  priceText: nullableString,
  minAge: nullableNumber,
  clubName: nullableString,
  leaderUsernames: z.array(z.string()),
  registrationUrl: nullableString,
  routeUrl: nullableString,
  routeDescription: nullableString,
  equipmentRequirements: nullableString,
  rules: nullableString,
});

export const postExtractionSchema = z.object({
  kind: z.enum(postKinds),
  kindReason: z.string(),
  trip: extractedTripSchema.nullable(),
  confidence: z.enum(["low", "medium", "high"]),
  notes: nullableString,
});

export type ExtractedTrip = z.infer<typeof extractedTripSchema>;
export type PostExtraction = z.infer<typeof postExtractionSchema>;

export const extractionSystemPrompt = `You turn Russian-language Telegram announcements of group bike rides into structured data for BikeTrips, a Moscow ride catalogue. Each request contains one channel post. Links in the post appear as Markdown, [label](url). The site shows the post text itself as the trip description, so you only extract fields.

First classify the post:
- single_trip: an announcement of one ride (one day, one start). This is what we import.
- digest: a list of many rides (often tagged #список) with only a time, title and distance per line.
- multi_day_tour: a trip spanning several days, usually paid and with lodging.
- cancellation: the post says a ride is cancelled ("отмена", crossed out). Still fill trip so we can match it to the ride.
- not_cycling: hikes ("пешка", "поход"), walking tours, road trips by car or bus, running, board games, conferences, sales, track racing ads, park news and other non-ride content.
- other: anything else (races and competitions, trip reports, channel announcements, adverts for paid tours and shops).

For single_trip, multi_day_tour and cancellation fill trip; otherwise set trip to null.

Rules for trip fields:
- Use only what the post states or clearly implies. Leave a field null rather than invent it.
- title: a short ride name in Russian without emojis or dates, e.g. "Красногорск — Звенигород".
- startDate / endDate: YYYY-MM-DD. Posts rarely include the year: pick the nearest date on or after the post's publication date that matches the day, month and weekday. endDate only for multi-day trips.
- startTime: HH:MM, Moscow time. When the post gives both a meeting time and a start time, use the meeting time.
- startLocationName: the meeting point as written (station, exit, landmark). If there are several pickup points, use the first.
- startLat / startLng: only from coordinates in the text or in a map link (Yandex links put longitude first in "point=" and "ll=" parameters). Otherwise null.
- distanceKm: the total distance; for "~35" or "±87" use the number. For "N км в одну сторону" use N and mention it in notes.
- paceMinKmh / paceMaxKmh: average speed range in km/h ("ССД 15-20" means 15 and 20). One number: put it in both.
- asphaltPercent / unpavedPercent: integers summing to 100 when the post gives the surface mix, even in playful wording ("смесь битумов 85%, такое себе 15%" means 85/15). If the parts add up to slightly more than 100, drop the smallest. "В основном асфальт" alone is not enough for numbers: leave null.
- unpavedSurfaceDetails: only surfaces the post mentions (hardpack = укатанный грунт, gravel = гравий, crushed_stone = щебень, sand = песок, forest_trails = лесные тропы/трейлы, mud = грязь, concrete_slabs = бетонные плиты).
- difficulty: beginner (short, easy, newcomers welcome), easy, medium (for regular riders, some climbs), hard (long distance, noticeable climbing), sport (high speed, fitness required). Set difficultyIsGuess to true when you infer it from distance and pace instead of the post naming it.
- isPaid / priceText: whether participation costs money and the price as written.
- minAge: e.g. 18 for "18+".
- clubName: the club or organizing team; leaderUsernames: Telegram usernames of leaders or organizers without "@".
- registrationUrl: the link where people sign up or ask questions (chat, contact, form). Null when the post only says to sign up in the comments.
- routeUrl: a link to the track or route map (Strava, Komoot, RideWithGPS, Yandex route), if any.
- routeDescription, equipmentRequirements, rules: short Russian texts if the post has them.

confidence reflects how sure you are about kind and the key fields (date, time, start, distance). Write kindReason and notes in Russian; use notes only for real ambiguities a moderator should check (an unclear date, several distances, a guessed meeting point). Do not mention fields that the post simply does not state, such as price. Keep place names exactly as written in the post.`;

export interface PostExtractionResult {
  extraction: PostExtraction | null;
  stopReason: string | null;
  usage: { inputTokens: number; outputTokens: number };
  model: string;
}

export async function extractTripFromPost(
  client: Anthropic,
  post: TelegramChannelPost,
  model = defaultExtractionModel
): Promise<PostExtractionResult> {
  // Haiku has no server-side refusal fallback; a refused post is recorded as an error.
  const response = await client.messages.parse({
    model,
    max_tokens: 16000,
    output_config: { effort: "medium", format: zodOutputFormat(postExtractionSchema) },
    system: [{ type: "text", text: extractionSystemPrompt, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: formatPostForPrompt(post) }],
  });

  return {
    extraction: response.stop_reason === "refusal" ? null : response.parsed_output,
    stopReason: response.stop_reason,
    usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
    model: response.model,
  };
}

export function formatPostForPrompt(post: TelegramChannelPost): string {
  const publishedAt = new Date(post.postedAt);
  const moscowDate = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(publishedAt);

  const lines = [
    `Channel: @${post.channel}`,
    `Post URL: ${post.url}`,
    `Published: ${moscowDate} (Moscow time)`,
  ];
  if (post.forwardedFrom) lines.push(`Forwarded from: ${post.forwardedFrom.name}`);
  if (post.authorSignature) lines.push(`Posted by: ${post.authorSignature}`);
  lines.push("", "<post>", post.text || "(no text)", "</post>");

  return lines.join("\n");
}

// The shape a moderator would review: the fields of CreateTripInput we can
// fill from a post, plus the import-only ones (source and external sign-up).
export interface ImportedTripDraft {
  title: string;
  description: string;
  startAt: string | null;
  endDate: string | null;
  startLocationName: string | null;
  startLat: number | null;
  startLng: number | null;
  distanceKm: number | null;
  paceMin: number | null;
  paceMax: number | null;
  difficulty: DifficultyLevel | null;
  asphaltPercent: number | null;
  unpavedPercent: number | null;
  unpavedSurfaceDetails: UnpavedSurfaceDetail[];
  routeDescription: string | null;
  equipmentRequirements: string | null;
  rules: string | null;
  sourceUrl: string;
  externalRegistrationUrl: string;
  routeUrl: string | null;
  clubName: string | null;
  leaderUsernames: string[];
  isPaid: boolean;
  priceText: string | null;
}

export interface DraftCheck {
  draft: ImportedTripDraft;
  /** Fields without which no trip is created. */
  missingRequired: string[];
  /** Fields the trip page shows as "Не указано". */
  unknownFields: string[];
  warnings: string[];
}

// Organizer and city come from the import source.
const requiredDraftFields = [
  "startAt",
  "startLocationName",
] as const satisfies readonly (keyof ImportedTripDraft)[];

// Imported trips may leave these empty; the moderator can fill them in.
const optionalTripFields = [
  "distanceKm",
  "difficulty",
  "asphaltPercent",
] as const satisfies readonly (keyof ImportedTripDraft)[];

export function buildTripDraft(post: TelegramChannelPost, trip: ExtractedTrip): DraftCheck {
  const warnings: string[] = [];

  const startAt = combineMoscowDateTime(trip.startDate, trip.startTime);
  if (trip.startDate && trip.startTime && !startAt)
    warnings.push(`Не удалось разобрать дату/время: ${trip.startDate} ${trip.startTime}`);
  if (trip.startDate && !trip.startTime) warnings.push("Не указано время старта");
  if (
    startAt &&
    new Date(startAt).getTime() < new Date(post.postedAt).getTime() - 24 * 60 * 60 * 1000
  ) {
    warnings.push("Дата старта раньше даты публикации поста");
  }

  const hasCoordinates =
    trip.startLat !== null &&
    trip.startLng !== null &&
    Math.abs(trip.startLat) <= 90 &&
    Math.abs(trip.startLng) <= 180;
  if ((trip.startLat !== null || trip.startLng !== null) && !hasCoordinates)
    warnings.push("Некорректные координаты старта");

  let { asphaltPercent, unpavedPercent } = trip;
  if (asphaltPercent !== null && unpavedPercent === null) unpavedPercent = 100 - asphaltPercent;
  if (unpavedPercent !== null && asphaltPercent === null) asphaltPercent = 100 - unpavedPercent;
  if (
    asphaltPercent !== null &&
    unpavedPercent !== null &&
    asphaltPercent + unpavedPercent !== 100
  ) {
    warnings.push(`Покрытие не суммируется в 100%: ${asphaltPercent}/${unpavedPercent}`);
  }

  if (trip.difficultyIsGuess && trip.difficulty)
    warnings.push("Сложность определена моделью, в посте не указана");

  const draft: ImportedTripDraft = {
    title: trip.title,
    // The post itself, with its line breaks, emoji and links, is the trip description.
    description: post.text,
    startAt,
    endDate: trip.endDate,
    startLocationName: trip.startLocationName,
    startLat: hasCoordinates ? trip.startLat : null,
    startLng: hasCoordinates ? trip.startLng : null,
    distanceKm: trip.distanceKm,
    paceMin: trip.paceMinKmh === null ? null : Math.round(trip.paceMinKmh),
    paceMax: trip.paceMaxKmh === null ? null : Math.round(trip.paceMaxKmh),
    difficulty: trip.difficulty,
    asphaltPercent: asphaltPercent === null ? null : Math.round(asphaltPercent),
    unpavedPercent: unpavedPercent === null ? null : Math.round(unpavedPercent),
    unpavedSurfaceDetails: trip.unpavedSurfaceDetails,
    routeDescription: trip.routeDescription,
    equipmentRequirements: trip.equipmentRequirements,
    rules: trip.rules,
    sourceUrl: post.url,
    // Sign-up usually happens in the post comments when no other link is given.
    externalRegistrationUrl: trip.registrationUrl ?? post.url,
    routeUrl: trip.routeUrl,
    clubName: trip.clubName,
    leaderUsernames: trip.leaderUsernames.map((username) => username.replace(/^@/, "")),
    isPaid: trip.isPaid,
    priceText: trip.priceText,
  };

  const missingRequired = requiredDraftFields.filter((field) => draft[field] === null);
  const unknownFields = optionalTripFields.filter((field) => draft[field] === null);

  return { draft, missingRequired, unknownFields, warnings };
}

export function combineMoscowDateTime(date: string | null, time: string | null): string | null {
  if (!date || !time) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!timeMatch) return null;

  const [, hours = "", minutes = ""] = timeMatch;
  const startAt = new Date(`${date}T${hours.padStart(2, "0")}:${minutes}:00${moscowOffset}`);
  return Number.isNaN(startAt.getTime()) ? null : startAt.toISOString();
}
