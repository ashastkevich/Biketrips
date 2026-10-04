import { describe, expect, it, vi } from "vitest";

vi.mock("./lib/api", () => ({
  getPublicTrips: vi.fn(async () => ({
    data: [{ id: "trip-1", slug: "evening-ride" }],
    source: "api",
  })),
}));

import robots from "./robots";
import sitemap from "./sitemap";

describe("sitemap", () => {
  it("lists the home page, public trips and legal documents", async () => {
    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls[0]).toBe("https://biketrips.ru/");
    expect(urls).toContain("https://biketrips.ru/trips/evening-ride");
    expect(urls).toContain("https://biketrips.ru/legal/privacy");
  });
});

describe("robots", () => {
  it("points to the sitemap and hides private sections", () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;

    expect(result.sitemap).toBe("https://biketrips.ru/sitemap.xml");
    expect(rules?.disallow).toEqual(expect.arrayContaining(["/api/", "/profile", "/trips/*/edit"]));
  });
});
