import { describe, expect, it } from "vitest";

import { getTripEditHref, getTripHref, getTripReference, isSameTripReference } from "./trip-links";

describe("trip link helpers", () => {
  it("uses the public slug when it is available", () => {
    expect(getTripReference({ id: "trip-id", slug: "morning-ride" })).toBe("morning-ride");
    expect(getTripHref({ id: "trip-id", slug: "morning-ride" })).toBe("/trips/morning-ride");
  });

  it("falls back to id instead of producing an undefined trip url", () => {
    expect(getTripReference({ id: "trip-id", slug: undefined })).toBe("trip-id");
    expect(getTripHref({ id: "trip-id", slug: undefined })).toBe("/trips/trip-id");
  });

  it("keeps invalid trip references away from concrete trip URLs", () => {
    expect(getTripReference({ id: "", slug: "" })).toBeNull();
    expect(getTripHref({ id: "", slug: "" })).toBe("/trips");
  });

  it("builds edit hrefs from the same safe reference", () => {
    expect(getTripEditHref({ id: "trip-id", slug: null }, { returnTo: "/", scope: "feed" })).toBe(
      "/trips/trip-id/edit?returnTo=%2F&scope=feed",
    );
  });

  it("matches modal URLs by either slug or id", () => {
    const trip = { id: "trip-id", slug: "morning-ride" };

    expect(isSameTripReference(trip, "morning-ride")).toBe(true);
    expect(isSameTripReference(trip, "trip-id")).toBe(true);
    expect(isSameTripReference(trip, "other-trip")).toBe(false);
  });
});
