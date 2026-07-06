import { afterEach, describe, expect, it, vi } from "vitest";

import { DadataGeocoder } from "./dadata-geocoder";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DadataGeocoder", () => {
  it("loads reverse geocoding results from the local API route", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          result: {
            name: "г Москва, ул Пырьева, д 9 к 3",
            point: { lat: 55.726119, lng: 37.521578 },
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", { location: { origin: "http://localhost:3000" } });

    const result = await new DadataGeocoder().reverse({
      lat: 55.726119,
      lng: 37.521578,
    });

    expect(result).toEqual({
      name: "г Москва, ул Пырьева, д 9 к 3",
      point: { lat: 55.726119, lng: 37.521578 },
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "http://localhost:3000/api/geocode/reverse?lat=55.726119&lng=37.521578",
    );
  });

  it("returns null when the local API has no usable result", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ result: null }))));
    vi.stubGlobal("window", { location: { origin: "http://localhost:3000" } });

    await expect(new DadataGeocoder().reverse({ lat: 55, lng: 37 })).resolves.toBeNull();
  });

  it("reports provider errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Геокодер DaData не настроен" }), { status: 503 }),
      ),
    );
    vi.stubGlobal("window", { location: { origin: "http://localhost:3000" } });

    await expect(new DadataGeocoder().reverse({ lat: 55, lng: 37 })).rejects.toThrow(
      "Геокодер DaData не настроен",
    );
  });
});
