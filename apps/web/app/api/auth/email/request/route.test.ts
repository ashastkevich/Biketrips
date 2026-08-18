import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /api/auth/email/request", () => {
  it("rejects invalid JSON payloads", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/email/request", {
        method: "POST",
        body: "{",
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "Укажите адрес электронной почты",
    });
  });

  it("proxies email code requests to the API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, devCode: "123456" }), {
        status: 200,
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/auth/email/request", {
        method: "POST",
        body: JSON.stringify({ email: "rider@example.com" }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, devCode: "123456" });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/auth/email/request",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "rider@example.com" }),
        cache: "no-store",
      })
    );
  });

  it("returns API error messages and unavailable fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Too many attempts" }), {
          status: 429,
        })
      )
    );

    const apiError = await POST(
      new Request("http://localhost/api/auth/email/request", {
        method: "POST",
        body: JSON.stringify({ email: "rider@example.com" }),
      })
    );

    expect(apiError.status).toBe(429);
    await expect(apiError.json()).resolves.toEqual({ message: "Too many attempts" });

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const unavailable = await POST(
      new Request("http://localhost/api/auth/email/request", {
        method: "POST",
        body: JSON.stringify({ email: "rider@example.com" }),
      })
    );

    expect(unavailable.status).toBe(503);
  });
});
