import { describe, expect, it } from "vitest";

import { hasAvailablePlaces, slugifyTripTitle, tripStatuses } from "./index.js";

describe("domain constants", () => {
  it("keeps the MVP trip status set", () => {
    expect(tripStatuses).toEqual(["draft", "published", "cancelled", "finished"]);
  });
});

describe("hasAvailablePlaces", () => {
  it("returns true when capacity is not full", () => {
    expect(hasAvailablePlaces({ capacity: 12, confirmedParticipants: 11 })).toBe(true);
  });

  it("returns false when capacity is full", () => {
    expect(hasAvailablePlaces({ capacity: 12, confirmedParticipants: 12 })).toBe(false);
  });

  it("returns true when the trip has no participant limit", () => {
    expect(hasAvailablePlaces({ capacity: null, confirmedParticipants: 500 })).toBe(true);
  });
});

describe("slugifyTripTitle", () => {
  it("transliterates a Russian trip title", () => {
    expect(slugifyTripTitle("Вечерняя поездка по Москве")).toBe(
      "vechernyaya-poezdka-po-moskve",
    );
  });

  it("normalizes punctuation and accented Latin characters", () => {
    expect(slugifyTripTitle("Café & Gravel — № 2")).toBe("cafe-gravel-2");
  });

  it("does not leave a trailing separator after truncation", () => {
    expect(slugifyTripTitle(`${"длинное ".repeat(12)}название`)).not.toMatch(/-$/);
  });
});
