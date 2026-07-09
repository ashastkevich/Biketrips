import { describe, expect, it } from "vitest";

import { fallbackCities, selectCity } from "./cities";

describe("selectCity", () => {
  it("selects the requested city by slug", () => {
    expect(selectCity(fallbackCities, "saint-petersburg").name).toBe("Санкт-Петербург");
  });

  it("uses Moscow for an unknown or missing slug", () => {
    expect(selectCity(fallbackCities, "unknown").slug).toBe("moscow");
    expect(selectCity(fallbackCities).slug).toBe("moscow");
  });
});
