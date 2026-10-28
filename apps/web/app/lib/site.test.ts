import { describe, expect, it } from "vitest";

import { defaultSocialImage, getSocialImage } from "./site";

describe("getSocialImage", () => {
  it("asks the API for a JPEG copy of an uploaded cover", () => {
    expect(getSocialImage("/api/trips/trip-1/cover-image?v=123", "Вечерняя покатушка")).toEqual({
      url: "/api/trips/trip-1/cover-image?v=123&format=jpeg",
      alt: "Вечерняя покатушка",
    });
    expect(getSocialImage("/api/trips/trip-1/cover-image", "Покатушка").url).toBe(
      "/api/trips/trip-1/cover-image?format=jpeg",
    );
  });

  it("falls back to the site-wide image for missing, pending or static covers", () => {
    expect(getSocialImage(null, "Покатушка")).toBe(defaultSocialImage);
    expect(getSocialImage("/api/trips/trip-1/pending-cover-image", "Покатушка")).toBe(defaultSocialImage);
    expect(getSocialImage("/img/trip-cover-route.webp", "Покатушка")).toBe(defaultSocialImage);
  });
});
