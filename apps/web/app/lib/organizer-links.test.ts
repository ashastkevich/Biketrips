import { describe, expect, it } from "vitest";

import { describeOrganizer, formatOrganizingSince, getOrganizerHref, hasPublicTrips } from "./organizer-links";

describe("organizer links", () => {
  it("builds the public organizer page link", () => {
    expect(getOrganizerHref("4f6a2c1e-0b7d-4c55-9a51-1f2e3d4c5b6a")).toBe(
      "/organizers/4f6a2c1e-0b7d-4c55-9a51-1f2e3d4c5b6a",
    );
  });

  it("formats the organizing start as a genitive month and year", () => {
    expect(formatOrganizingSince("2026-05-01T08:00:00.000Z")).toBe("мая 2026");
  });

  it("indexes only profiles with public trips", () => {
    expect(hasPublicTrips({ upcomingTrips: [], pastTrips: [] })).toBe(false);
    expect(hasPublicTrips({ upcomingTrips: [], pastTrips: [{} as never] })).toBe(true);
  });

  it("describes the organizer for search snippets", () => {
    expect(describeOrganizer({ displayName: "Алексей", city: "Москва", bio: "Гравий\n\nи кофе" })).toBe(
      "Алексей — организатор велопоездок на BikeTrips, Москва. Гравий и кофе",
    );
    expect(describeOrganizer({ displayName: "Алексей", city: null, bio: "x".repeat(300) })).toHaveLength(198);
  });
});
