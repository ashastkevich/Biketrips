import { describe, expect, it } from "vitest";

import { normalizeRouteFileName } from "./route-file-names.js";

describe("normalizeRouteFileName", () => {
  it("keeps normal file names unchanged", () => {
    expect(normalizeRouteFileName("forest-route.gpx")).toBe("forest-route.gpx");
  });

  it("decodes Cyrillic file names that arrived as latin1 mojibake", () => {
    const mojibakeName = Buffer.from("маршрут.gpx", "utf8").toString("latin1");

    expect(normalizeRouteFileName(mojibakeName)).toBe("маршрут.gpx");
  });
});
