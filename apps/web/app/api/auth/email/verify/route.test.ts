import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /api/auth/email/verify", () => {
  it("rejects invalid JSON payloads", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/email/verify", {
        method: "POST",
        body: "{",
      })
    );

    expect(response.status).toBe(400);
  });

  it("proxies verification with an existing session and refreshes the cookie", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ accessToken: "new.jwt.token" }), {
        status: 200,
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("https://biketrips.test/api/auth/email/verify", {
        method: "POST",
        headers: {
          cookie: "other=1; biketrips_session=old.jwt.token",
          "x-forwarded-proto": "https",
        },
        body: JSON.stringify({ email: "rider@example.com", code: "123456" }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/auth/email/verify",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer old.jwt.token",
        }),
      })
    );
    expect(response.headers.get("set-cookie")).toContain("biketrips_session=new.jwt.token");
    expect(response.headers.get("set-cookie")).toContain("Secure");
  });

  it("returns an error when the API does not issue a token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Invalid code" }), {
          status: 400,
        })
      )
    );

    const response = await POST(
      new Request("http://localhost/api/auth/email/verify", {
        method: "POST",
        body: JSON.stringify({ email: "rider@example.com", code: "000000" }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ message: "Invalid code" });
  });

  it("reports unavailable auth service", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const response = await POST(
      new Request("http://localhost/api/auth/email/verify", {
        method: "POST",
        body: JSON.stringify({ email: "rider@example.com", code: "123456" }),
      })
    );

    expect(response.status).toBe(503);
  });
});
