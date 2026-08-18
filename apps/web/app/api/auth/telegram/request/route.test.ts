import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /api/auth/telegram/request", () => {
  it("starts Telegram login and forwards the current session when present", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ loginId: "login-1", pollToken: "poll-token" }), {
        status: 200,
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/auth/telegram/request", {
        method: "POST",
        headers: { cookie: "biketrips_session=session.jwt" },
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      loginId: "login-1",
      pollToken: "poll-token",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/auth/telegram/request",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer session.jwt",
        },
        body: "{}",
        cache: "no-store",
      })
    );
  });

  it("returns API errors and unavailable fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Bot disabled" }), {
          status: 503,
        })
      )
    );

    const apiError = await POST(new Request("http://localhost/api/auth/telegram/request"));

    expect(apiError.status).toBe(503);
    await expect(apiError.json()).resolves.toEqual({ message: "Bot disabled" });

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const unavailable = await POST(new Request("http://localhost/api/auth/telegram/request"));

    expect(unavailable.status).toBe(503);
  });
});
