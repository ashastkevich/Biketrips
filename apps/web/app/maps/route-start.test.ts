import { describe, expect, it } from "vitest";

import type { GpxRoute } from "./gpx";
import {
  formatDistance,
  getRouteStartDistance,
  isFarRouteStart,
  isLoopRoute,
  isSamePlace,
} from "./route-start";

function createRoute(points: GpxRoute["points"]): GpxRoute {
  return { points, bounds: { north: 0, east: 0, south: 0, west: 0 } };
}

describe("route start", () => {
  const route = createRoute([
    { lat: 55.842715, lng: 37.587213 },
    { lat: 55.9, lng: 37.7 },
  ]);

  it("measures the distance from the meeting point to the start of the track", () => {
    expect(getRouteStartDistance(null, route)).toBeNull();
    expect(getRouteStartDistance({ lat: 55.842715, lng: 37.587213 }, null)).toBeNull();
    expect(getRouteStartDistance({ lat: 55.842715, lng: 37.587213 }, route)).toBe(0);
    // Noginsk is about 54.5 km from the Moscow track start.
    expect(getRouteStartDistance({ lat: 55.853033, lng: 38.460148 }, route)).toBeCloseTo(54_500, -3);
  });

  it("treats only meeting points further than 5 km as far", () => {
    expect(isFarRouteStart(null)).toBe(false);
    expect(isFarRouteStart(5000)).toBe(false);
    expect(isFarRouteStart(5001)).toBe(true);
  });

  it("detects the same place and loop routes", () => {
    expect(isSamePlace(30)).toBe(true);
    expect(isSamePlace(80)).toBe(false);
    expect(isLoopRoute(route)).toBe(false);
    expect(isLoopRoute(createRoute([route.points[0]!, route.points[1]!, route.points[0]!]))).toBe(true);
  });

  it("formats distances for people", () => {
    expect(formatDistance(4)).toBe("10 м");
    expect(formatDistance(347)).toBe("350 м");
    expect(formatDistance(1240)).toBe("1,2 км");
    expect(formatDistance(54_480)).toBe("54 км");
  });
});
