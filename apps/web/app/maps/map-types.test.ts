import { describe, expect, it } from "vitest";

import { formatCoordinate, formatPoint, isValidMapPoint } from "./map-types";

describe("map coordinates", () => {
  it("formats coordinates with six decimal places", () => {
    expect(formatCoordinate(55.7512444)).toBe("55.751244");
    expect(formatPoint({ lat: 55.75, lng: 37.61 })).toBe("55.750000, 37.610000");
  });

  it("accepts WGS84 boundary values", () => {
    expect(isValidMapPoint({ lat: -90, lng: -180 })).toBe(true);
    expect(isValidMapPoint({ lat: 90, lng: 180 })).toBe(true);
  });

  it("rejects non-finite and out-of-range values", () => {
    expect(isValidMapPoint({ lat: 90.1, lng: 37 })).toBe(false);
    expect(isValidMapPoint({ lat: 55, lng: -180.1 })).toBe(false);
    expect(isValidMapPoint({ lat: Number.NaN, lng: 37 })).toBe(false);
  });
});
