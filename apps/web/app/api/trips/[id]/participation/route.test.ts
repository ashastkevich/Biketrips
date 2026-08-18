import { cookies } from "next/headers";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DELETE, GET, POST } from "./route";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

afterEach(() => {
  vi.mocked(cookies).mockReset();
  vi.unstubAllGlobals();
});

describe("/api/trips/[id]/participation", () => {
  it("requires authentication", async () => {
    mockSessionCookie(null);

    const response = await GET(new Request("http://localhost"), createContext("trip 1"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ message: "Требуется авторизация" });
  });

  it("proxies participation lookup, join and cancellation", async () => {
    mockSessionCookie("session.jwt");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "confirmed" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "participant-1" }), { status: 201 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "cancelled" }), { status: 200 })
      );
    vi.stubGlobal("fetch", fetchMock);

    const getResponse = await GET(new Request("http://localhost"), createContext("trip 1"));
    const postResponse = await POST(new Request("http://localhost"), createContext("trip 1"));
    const deleteResponse = await DELETE(new Request("http://localhost"), createContext("trip 1"));

    expect(getResponse.status).toBe(200);
    expect(postResponse.status).toBe(201);
    expect(deleteResponse.status).toBe(200);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:4000/trips/trip%201/participation",
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: "Bearer session.jwt" },
        cache: "no-store",
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:4000/trips/trip%201/participants",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer session.jwt",
          "Content-Type": "application/json",
        },
        body: "{}",
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost:4000/trips/trip%201/participants/me",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("reports unavailable trips service", async () => {
    mockSessionCookie("session.jwt");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const response = await GET(new Request("http://localhost"), createContext("trip-1"));

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
