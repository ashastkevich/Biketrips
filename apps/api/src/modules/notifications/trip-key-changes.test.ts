import { describe, expect, it } from "vitest";

import { diffTripKeyFields, type TripKeySnapshot } from "./trip-key-changes.js";

const base: TripKeySnapshot = {
  startAt: "2099-08-16T08:00:00.000Z",
  startLocationName: "Сокольники",
  startLat: 55.79,
  startLng: 37.68,
  distanceKm: 40,
  routeFileKey: null,
  routeFileName: null,
};

describe("diffTripKeyFields", () => {
  it("reports nothing for an unchanged snapshot", () => {
    expect(diffTripKeyFields(base, { ...base })).toEqual([]);
  });

  it("ignores small distance changes and start point nudges", () => {
    expect(diffTripKeyFields(base, { ...base, distanceKm: 43, startLat: 55.791 })).toEqual([]);
  });

  it("reports start time, place, distance and route changes", () => {
    expect(
      diffTripKeyFields(base, {
        ...base,
        startAt: "2099-08-16T09:00:00.000Z",
        startLocationName: "Парк Горького",
        distanceKm: 50,
        routeFileKey: "trip/1-route.gpx",
        routeFileName: "route.gpx",
      }),
    ).toEqual([
      { field: "startAt", before: base.startAt, after: "2099-08-16T09:00:00.000Z" },
      { field: "startLocation", before: "Сокольники", after: "Парк Горького" },
      { field: "distance", before: 40, after: 50 },
      { field: "route", before: null, after: "route.gpx" },
    ]);
  });

  it("reports a moved start point when the place name stays the same", () => {
    expect(diffTripKeyFields(base, { ...base, startLat: 55.8 })).toEqual([{ field: "startPoint" }]);
  });
});
