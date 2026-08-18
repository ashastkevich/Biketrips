import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /api/auth/telegram/status", () => {
  it("rejects invalid payloads", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/telegram/status", {
        method: "POST",
        body: "{",
      })
    );

    expect(response.status).toBe(400);
  });

  it("returns pending status without setting a cookie", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: "pending" }), {
          status: 200,
        })
      )
    );

    const response = await POST(
      new Request("http://localhost/api/auth/telegram/status", {
        method: "POST",
        body: JSON.stringify({ loginId: "login-1", pollToken: "poll-token" }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "pending" });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("sets the session cookie for confirmed logins", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: "confirmed", accessToken: "telegram.jwt" }), {
          status: 200,
        })
      )
    );

    const response = await POST(
      new Request("https://biketrips.test/api/auth/telegram/status", {
        method: "POST",
        headers: { "x-forwarded-proto": "https" },
        body: JSON.stringify({ loginId: "login-1", pollToken: "poll-token" }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, status: "confirmed" });
    expect(response.headers.get("set-cookie")).toContain("biketrips_session=telegram.jwt");
    expect(response.headers.get("set-cookie")).toContain("Secure");
  });

  it("returns API errors and unavailable fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Unknown login" }), {
          status: 404,
        })
      )
    );

    const apiError = await POST(
      new Request("http://localhost/api/auth/telegram/status", {
        method: "POST",
        body: JSON.stringify({ loginId: "missing", pollToken: "poll-token" }),
      })
    );

    expect(apiError.status).toBe(404);
    await expect(apiError.json()).resolves.toEqual({ message: "Unknown login" });

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const unavailable = await POST(
      new Request("http://localhost/api/auth/telegram/status", {
        method: "POST",
        body: JSON.stringify({ loginId: "login-1", pollToken: "poll-token" }),
      })
    );

    expect(unavailable.status).toBe(503);
  });
});
