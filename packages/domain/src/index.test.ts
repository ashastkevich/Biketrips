import { describe, expect, it } from "vitest";

import { hasAvailablePlaces, tripStatuses } from "./index.js";

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
});
