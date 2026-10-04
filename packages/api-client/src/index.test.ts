import { describe, expect, it, vi } from "vitest";

import type { CreateTripInput } from "@biketrips/domain";
import { BikeTripsApiClient } from "./index.js";

describe("BikeTripsApiClient", () => {
  it("serializes trip filters and normalizes trailing slashes in the base URL", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse([{ id: "trip-1" }]));
    const client = new BikeTripsApiClient({
      baseUrl: "https://api.example.test/",
      fetcher,
    });

    await client.listTrips({
      city: "moscow",
      difficulty: "medium",
      bikeType: "gravel",
      dateFrom: "2099-08-01",
      dateTo: "2099-08-31",
    });

    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.test/trips?city=moscow&difficulty=medium&bikeType=gravel&dateFrom=2099-08-01&dateTo=2099-08-31",
      expect.objectContaining({
        method: "GET",
        headers: expect.any(Headers),
      })
    );
    expect((fetcher.mock.calls[0]?.[1]?.headers as Headers).get("Accept")).toBe("application/json");
  });

  it("adds JSON and auth headers for authenticated requests", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ id: "trip-1" }));
    const client = new BikeTripsApiClient({
      baseUrl: "https://api.example.test",
      authToken: "secret-token",
      fetcher,
    });
    const input = createTripInput();

    await client.createTrip(input);

    const init = fetcher.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Headers;
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.test/trips",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(input),
      })
    );
    expect(headers.get("Accept")).toBe("application/json");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("Authorization")).toBe("Bearer secret-token");
  });

  it("throws before authenticated requests when no token is available", async () => {
    const fetcher = vi.fn();
    const client = new BikeTripsApiClient({
      baseUrl: "https://api.example.test",
      fetcher,
    });

    await expect(client.publishTrip("trip-1")).rejects.toThrow(
      "BikeTrips API request requires an auth token"
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("uses backend validation messages when requests fail", async () => {
    const client = new BikeTripsApiClient({
      baseUrl: "https://api.example.test",
      fetcher: vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: ["title is required", "city is required"] }), {
          status: 400,
          statusText: "Bad Request",
        })
      ),
    });

    await expect(client.getTrip("trip-1")).rejects.toThrow(
      "BikeTrips API request failed: title is required; city is required"
    );
  });

  it("sends multipart create requests without forcing JSON content type", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ id: "trip-1" }));
    const client = new BikeTripsApiClient({
      baseUrl: "https://api.example.test",
      authToken: "secret-token",
      fetcher,
    });
    const routeFile = new File(["<gpx></gpx>"], "route.gpx", {
      type: "application/gpx+xml",
    });
    const coverImageFile = new File(["cover"], "cover.webp", {
      type: "image/webp",
    });
    const input = createTripInput();

    await client.createTripWithRouteFile(input, routeFile, coverImageFile);

    const init = fetcher.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Headers;
    const body = init.body as FormData;
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.test/trips/with-route-file",
      expect.objectContaining({ method: "POST" })
    );
    expect(headers.get("Content-Type")).toBeNull();
    expect(headers.get("Authorization")).toBe("Bearer secret-token");
    expect(JSON.parse(String(body.get("payload")))).toEqual(input);
    expect(body.get("routeGpxFile")).toBe(routeFile);
    expect(body.get("coverImageFile")).toBe(coverImageFile);
  });

  it("sends multipart update requests with removeRouteFile flag", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ id: "trip-1" }));
    const client = new BikeTripsApiClient({
      baseUrl: "https://api.example.test",
      authToken: "secret-token",
      fetcher,
    });

    await client.updateTripWithRouteFile("trip 1", { title: "Updated" } as never, {
      removeRouteFile: true,
    });

    const init = fetcher.mock.calls[0]?.[1] as RequestInit;
    const body = init.body as FormData;
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.test/trips/trip%201/with-route-file",
      expect.objectContaining({ method: "PATCH" })
    );
    expect(JSON.parse(String(body.get("payload")))).toEqual({ title: "Updated" });
    expect(body.get("removeRouteFile")).toBe("true");
  });

  it("targets participation endpoints with encoded identifiers", async () => {
    const fetcher = vi
      .fn()
      .mockImplementation(() => Promise.resolve(jsonResponse({ id: "participant-1" })));
    const client = new BikeTripsApiClient({
      baseUrl: "https://api.example.test",
      authToken: "secret-token",
      fetcher,
    });

    await client.joinTrip("trip 1", { userId: "user-1", name: "Alex" });
    await client.getParticipation("trip 1");
    await client.cancelParticipation("trip 1");
    await client.updateParticipantStatus("trip 1", "participant 1", "confirmed");

    expect(fetcher.mock.calls.map((call) => call[0])).toEqual([
      "https://api.example.test/trips/trip%201/participants",
      "https://api.example.test/trips/trip%201/participation",
      "https://api.example.test/trips/trip%201/participants/me",
      "https://api.example.test/trips/trip%201/participants/participant%201",
    ]);
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function createTripInput(): CreateTripInput {
  return {
    title: "Forest route",
    description: "A ride through forest roads",
    startAt: "2099-08-16T08:00:00.000Z",
    startLocationName: "Park",
    distanceKm: 42,
    difficulty: "medium",
    bikeType: "gravel",
    asphaltPercent: 70,
    unpavedPercent: 30,
    dropPolicy: "no_drop",
    organizerId: "organizer-1",
    cityId: "city-1",
  };
}
