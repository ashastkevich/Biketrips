import { cookies } from "next/headers";
import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

afterEach(() => {
  vi.mocked(cookies).mockReset();
  vi.unstubAllGlobals();
});

describe("POST /api/trips/[id]/cancel", () => {
  it("requires authentication", async () => {
    mockSessionCookie(null);

    const response = await POST(new Request("http://localhost"), createContext("trip-1"));

    expect(response.status).toBe(401);
  });

  it("proxies cancellation to the API", async () => {
    mockSessionCookie("session.jwt");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "cancelled" }), {
        status: 200,
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(new Request("http://localhost"), createContext("trip 1"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "cancelled" });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:4000/trips/trip%201/cancel", {
      method: "POST",
      headers: { Authorization: "Bearer session.jwt" },
      cache: "no-store",
    });
  });

  it("reports unavailable trips service", async () => {
    mockSessionCookie("session.jwt");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const response = await POST(new Request("http://localhost"), createContext("trip-1"));

    expect(response.status).toBe(503);
  });
});

function mockSessionCookie(value: string | null) {
  vi.mocked(cookies).mockResolvedValue({
    get: vi.fn((name: string) =>
      name === "biketrips_session" && value ? { name, value } : undefined
    ),
  } as never);
}

function createContext(id: string) {
  return { params: Promise.resolve({ id }) };
}
