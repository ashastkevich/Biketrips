import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /api/trips/[id]/route-file", () => {
  it("forwards the session token and download headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("<gpx></gpx>", {
        status: 200,
        headers: {
          "content-type": "application/gpx+xml",
          "content-disposition": "attachment; filename*=UTF-8''route.gpx",
        },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      new Request("http://localhost/api/trips/trip%201/route-file", {
        headers: { cookie: "theme=dark; biketrips_session=token-1" },
      }),
      createContext("trip 1")
    );

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("<gpx></gpx>");
    expect(response.headers.get("content-type")).toBe("application/gpx+xml");
    expect(response.headers.get("content-disposition")).toBe(
      "attachment; filename*=UTF-8''route.gpx"
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:4000/trips/trip%201/route-file", {
      headers: { authorization: "Bearer token-1" },
      cache: "no-store",
    });
  });

  it("fetches anonymously without a session", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("<gpx></gpx>"));
    vi.stubGlobal("fetch", fetchMock);

    await GET(new Request("http://localhost"), createContext("trip-1"));

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:4000/trips/trip-1/route-file", {
      cache: "no-store",
    });
  });

  it("returns not found for failed backend responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 404 }))
    );

    const response = await GET(new Request("http://localhost"), createContext("trip-1"));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ message: "GPX-файл не найден" });
  });

  it("reports unavailable trips service", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const response = await GET(new Request("http://localhost"), createContext("trip-1"));

    expect(response.status).toBe(503);
  });
});

function createContext(id: string) {
  return { params: Promise.resolve({ id }) };
}
