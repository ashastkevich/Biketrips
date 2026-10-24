import { describe, expect, it } from "vitest";

import type { TelegramChannelPost } from "./telegram-channel-preview.js";
import {
  buildTripDraft,
  combineMoscowDateTime,
  formatPostForPrompt,
  type ExtractedTrip,
} from "./trip-post-extraction.js";

const post: TelegramChannelPost = {
  channel: "MskVelo",
  messageId: 19586,
  url: "https://t.me/MskVelo/19586",
  postedAt: "2026-10-12T18:56:55.000Z",
  edited: false,
  text: "Сб. 17 Октября, старт 9-15",
  hasMedia: false,
  coverUrl: null,
  authorSignature: "Владимир",
  forwardedFrom: null,
};

const trip: ExtractedTrip = {
  title: "Мещерский парк через Барвиху",
  startDate: "2026-10-17",
  startTime: "9:15",
  endDate: null,
  startLocationName: "МЦД Павшино",
  startLat: 55.82,
  startLng: 37.37,
  finishLocationName: null,
  distanceKm: 88,
  paceMinKmh: 15,
  paceMaxKmh: 20.4,
  asphaltPercent: 80,
  unpavedPercent: null,
  unpavedSurfaceDetails: [],
  difficulty: "medium",
  difficultyIsGuess: false,
  isPaid: false,
  priceText: null,
  minAge: null,
  clubName: "МТБ Красногорск, СЗАО",
  leaderUsernames: ["@Kasolles"],
  registrationUrl: null,
  routeUrl: null,
  routeDescription: null,
  equipmentRequirements: null,
  rules: null,
};

describe("combineMoscowDateTime", () => {
  it("converts Moscow local time to UTC", () => {
    expect(combineMoscowDateTime("2026-10-17", "9:15")).toBe("2026-10-17T06:15:00.000Z");
  });

  it("returns null for missing or malformed parts", () => {
    expect(combineMoscowDateTime("2026-10-17", null)).toBeNull();
    expect(combineMoscowDateTime("17.10", "09:15")).toBeNull();
    expect(combineMoscowDateTime("2026-10-17", "9-15")).toBeNull();
  });
});

describe("buildTripDraft", () => {
  it("maps a complete extraction to a draft", () => {
    const { draft, missingRequired, warnings } = buildTripDraft(post, trip);

    expect(draft).toMatchObject({
      startAt: "2026-10-17T06:15:00.000Z",
      paceMin: 15,
      paceMax: 20,
      asphaltPercent: 80,
      unpavedPercent: 20,
      leaderUsernames: ["Kasolles"],
      sourceUrl: post.url,
      externalRegistrationUrl: post.url,
    });
    expect(missingRequired).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it("requires a start date and meeting point", () => {
    const { missingRequired } = buildTripDraft(post, {
      ...trip,
      startTime: null,
      startLocationName: null,
    });

    expect(missingRequired).toEqual(["startAt", "startLocationName"]);
  });

  it("reports unknown fields and suspicious values", () => {
    const { draft, missingRequired, unknownFields, warnings } = buildTripDraft(post, {
      ...trip,
      startDate: "2026-09-01",
      startLat: 155,
      distanceKm: null,
      difficulty: "easy",
      difficultyIsGuess: true,
      asphaltPercent: null,
      registrationUrl: "https://t.me/gravelmtb",
    });

    expect(missingRequired).toEqual([]);
    expect(unknownFields).toEqual(["distanceKm", "asphaltPercent"]);
    expect(draft.startLat).toBeNull();
    expect(draft.externalRegistrationUrl).toBe("https://t.me/gravelmtb");
    expect(warnings).toEqual([
      "Дата старта раньше даты публикации поста",
      "Некорректные координаты старта",
      "Сложность определена моделью, в посте не указана",
    ]);
  });
});

describe("formatPostForPrompt", () => {
  it("includes the Moscow publication date and the post text", () => {
    const prompt = formatPostForPrompt(post);

    expect(prompt).toContain("понедельник, 12 октября 2026");
    expect(prompt).toContain("21:56");
    expect(prompt).toContain("<post>\nСб. 17 Октября, старт 9-15\n</post>");
  });
});
