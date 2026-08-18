import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /api/trips/[id]/cover-image", () => {
  it("proxies cover images with cache headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("cover", {
        status: 200,
        headers: {
          "content-type": "image/webp",
          "cache-control": "public, max-age=86400",
        },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      new Request("http://localhost/api/trips/trip%201/cover-image?v=123"),
      createContext("trip 1")
    );

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("cover");
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("cache-control")).toBe("public, max-age=86400");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/trips/trip%201/cover-image?v=123",
      { next: { revalidate: 86400 } }
    );
  });

  it("returns not found for failed backend responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 404 }))
    );

    const response = await GET(new Request("http://localhost"), createContext("trip-1"));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ message: "Обложка не найдена" });
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
