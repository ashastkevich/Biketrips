import { afterEach, describe, expect, it, vi } from "vitest";

import { MapTilerGeocoder } from "./maptiler-geocoder";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("MapTilerGeocoder", () => {
  it("maps the first valid feature to an application result", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          features: [
            {
              center: [37.618423, 55.751244],
              address: "1",
              context: [
                { id: "district.123", text: "Тверской район" },
                { id: "place.456", text: "Кремль" },
                { id: "municipality.457", text: "Тверской район" },
                { id: "subregion.458", text: "Москва" },
                { id: "postal_code.789", text: "103073" },
                { id: "country.101", text: "Россия" },
              ],
              place_name: "Манежная площадь, Тверской район, Москва, 103073, Россия",
              text: "Манежная площадь",
            },
          ],
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await new MapTilerGeocoder("public-key").reverse({
      lat: 55.751244,
      lng: 37.618423,
    });

    expect(result).toEqual({
      name: "Манежная площадь, Тверской район, Москва",
      point: { lat: 55.751244, lng: 37.618423 },
    });
    const requestedUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(requestedUrl).toContain("/geocoding/37.618423%2C55.751244.json");
    expect(requestedUrl).toContain("language=ru");
    expect(requestedUrl).toContain("key=public-key");
  });

  it("returns null when the response has no usable features", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ features: [{ center: ["invalid", 55] }] }), {
          status: 200,
        })
      )
    );

    await expect(
      new MapTilerGeocoder("public-key").reverse({ lat: 55, lng: 37 })
    ).resolves.toBeNull();
  });

  it("reports provider errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 429 })));

    await expect(new MapTilerGeocoder("public-key").reverse({ lat: 55, lng: 37 })).rejects.toThrow(
      "MapTiler geocoding failed: 429"
    );
  });
});
