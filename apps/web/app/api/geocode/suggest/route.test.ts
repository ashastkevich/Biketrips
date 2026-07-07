import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

const originalDadataApiKey = process.env.DADATA_API_KEY;

afterEach(() => {
  process.env.DADATA_API_KEY = originalDadataApiKey;
  vi.unstubAllGlobals();
});

describe("GET /api/geocode/suggest", () => {
  it("returns normalized DaData address suggestions with coordinates", async () => {
    process.env.DADATA_API_KEY = "secret-token";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          suggestions: [
            {
              value: "г Москва, ул Пырьева, д 9 к 3",
              data: {
                fias_id: "address-id",
                geo_lat: "55.726119",
                geo_lon: "37.521578",
              },
            },
          ],
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      new Request("http://localhost/api/geocode/suggest?query=Пырьева%209")
    );

    await expect(response.json()).resolves.toEqual({
      results: [
        {
          id: "address-id",
          name: "г Москва, ул Пырьева, д 9 к 3",
          point: { lat: 55.726119, lng: 37.521578 },
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Token secret-token",
        }),
        body: JSON.stringify({
          query: "Пырьева 9",
          count: 5,
          language: "ru",
        }),
      })
    );
  });

  it("ignores suggestions without usable coordinates", async () => {
    process.env.DADATA_API_KEY = "secret-token";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            suggestions: [
              {
                value: "г Москва, ул Пырьева",
                data: { geo_lat: null, geo_lon: null },
              },
            ],
          }),
          { status: 200 }
        )
      )
    );

    const response = await GET(new Request("http://localhost/api/geocode/suggest?query=Пырьева"));

    await expect(response.json()).resolves.toEqual({ results: [] });
  });

  it("returns no results for short queries", async () => {
    const response = await GET(new Request("http://localhost/api/geocode/suggest?query=м"));

    await expect(response.json()).resolves.toEqual({ results: [] });
  });

  it("reports missing DaData configuration", async () => {
    process.env.DADATA_API_KEY = "";

    const response = await GET(new Request("http://localhost/api/geocode/suggest?query=Пырьева"));

    expect(response.status).toBe(503);
  });
});
