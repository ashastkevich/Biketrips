import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

const originalDadataApiKey = process.env.DADATA_API_KEY;

afterEach(() => {
  process.env.DADATA_API_KEY = originalDadataApiKey;
  vi.unstubAllGlobals();
});

describe("GET /api/geocode/reverse", () => {
  it("returns a normalized DaData address for valid coordinates", async () => {
    process.env.DADATA_API_KEY = "secret-token";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          suggestions: [{ value: "г Москва, ул Пырьева, д 9 к 3" }],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      new Request("http://localhost/api/geocode/reverse?lat=55.726119&lng=37.521578"),
    );

    await expect(response.json()).resolves.toEqual({
      result: {
        name: "г Москва, ул Пырьева, д 9 к 3",
        point: { lat: 55.726119, lng: 37.521578 },
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://suggestions.dadata.ru/suggestions/api/4_1/rs/geolocate/address",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Token secret-token",
        }),
        body: JSON.stringify({
          lat: 55.726119,
          lon: 37.521578,
          count: 1,
          radius_meters: 150,
          language: "ru",
        }),
      }),
    );
  });

  it("rejects invalid coordinates", async () => {
    const response = await GET(new Request("http://localhost/api/geocode/reverse?lat=100&lng=37"));

    expect(response.status).toBe(400);
  });

  it("reports missing DaData configuration", async () => {
    process.env.DADATA_API_KEY = "";

    const response = await GET(new Request("http://localhost/api/geocode/reverse?lat=55&lng=37"));

    expect(response.status).toBe(503);
  });
});
