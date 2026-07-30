import { describe, expect, it } from "vitest";

import { getTripCardCoverBackground, getTripCoverBackground } from "./assets";

describe("asset helpers", () => {
  it("does not generate CSS urls for missing trip covers", () => {
    expect(getTripCoverBackground(undefined)).not.toContain("undefined");
    expect(getTripCoverBackground(null)).not.toContain("null");
    expect(getTripCardCoverBackground(undefined)).not.toContain("undefined");
    expect(getTripCardCoverBackground(null)).not.toContain("null");
  });

  it("uses provided cover images when present", () => {
    expect(getTripCoverBackground("/img/trip-cover-forest-road.webp")).toBe(
      'url("/img/trip-cover-forest-road.webp")',
    );
    expect(getTripCardCoverBackground("/img/trip-cover-forest-road.webp")).toContain(
      'url("/img/trip-cover-forest-road.webp")',
    );
  });
});
