import jwt from "jsonwebtoken";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PATCH } from "./route";

const originalJwtSecret = process.env.JWT_SECRET;

afterEach(() => {
  process.env.JWT_SECRET = originalJwtSecret;
  vi.unstubAllGlobals();
});

describe("PATCH /api/profile", () => {
  it("requires a valid session cookie", async () => {
    const missing = await PATCH(
      new Request("http://localhost/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ name: "Alex" }),
      })
    );

    expect(missing.status).toBe(401);
    await expect(missing.json()).resolves.toEqual({ message: "Authentication required" });

    const invalid = await PATCH(
      new Request("http://localhost/api/profile", {
        method: "PATCH",
        headers: { cookie: "biketrips_session=broken" },
        body: JSON.stringify({ name: "Alex" }),
      })
    );

    expect(invalid.status).toBe(401);
    await expect(invalid.json()).resolves.toEqual({ message: "Invalid session" });
  });

  it("validates profile fields before calling the API", async () => {
    const token = createToken();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const shortName = await PATCH(createRequest(token, { name: "A" }));
    const invalidPhone = await PATCH(createRequest(token, { name: "Alex", phone: "+79990000000" }));
    const invalidEmail = await PATCH(
      createRequest(token, { name: "Alex", email: "алекс@example.com" })
    );
    const punycodeEmail = await PATCH(
      createRequest(token, { name: "Alex", email: "alex@xn--e1afmkfd.xn--p1ai" })
    );

    expect(shortName.status).toBe(400);
    expect(invalidPhone.status).toBe(400);
    expect(invalidEmail.status).toBe(400);
    expect(punycodeEmail.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("updates the database profile and refreshes the session cookie", async () => {
    process.env.JWT_SECRET = "profile-test-secret";
    const token = createToken({
      phone: "+7 (999) 000-00-00",
      phoneVerified: true,
      telegram: "alex_rides",
      telegramVerified: true,
      email: "old@example.com",
      emailVerified: true,
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          cityId: "city-1",
          city: { name: "Москва" },
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await PATCH(
      createRequest(
        token,
        {
          name: " Alex Rider ",
          phone: " +7 (999) 000-00-00 ",
          telegram: "@alex_rides",
          email: " NEW@Example.COM ",
          cityId: " city-1 ",
        },
        "https://biketrips.test/api/profile",
        { "x-forwarded-proto": "https" }
      )
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      name: "Alex Rider",
      phone: "+7 (999) 000-00-00",
      telegram: "alex_rides",
      email: "new@example.com",
      cityId: "city-1",
      city: "Москва",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/users/user-1",
      expect.objectContaining({
        method: "PATCH",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "Alex Rider",
          email: "new@example.com",
          phoneNumber: "+7 (999) 000-00-00",
          cityId: "city-1",
        }),
        cache: "no-store",
      })
    );
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("biketrips_session=");
    expect(cookie).toContain("Secure");
    const updatedToken = cookie.match(/biketrips_session=([^;]+)/)?.[1] ?? "";
    const payload = jwt.verify(updatedToken, "profile-test-secret");
    expect(payload).toMatchObject({
      sub: "user-1",
      name: "Alex Rider",
      phoneVerified: true,
      telegramVerified: true,
      emailVerified: false,
      cityId: "city-1",
      city: "Москва",
    });
  });

  it("returns backend error messages and unavailable fallback", async () => {
    const token = createToken();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Email already exists" }), {
          status: 409,
        })
      )
    );

    const apiError = await PATCH(createRequest(token, { name: "Alex" }));

    expect(apiError.status).toBe(409);
    await expect(apiError.json()).resolves.toEqual({ message: "Email already exists" });

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const unavailable = await PATCH(createRequest(token, { name: "Alex" }));

    expect(unavailable.status).toBe(503);
    await expect(unavailable.json()).resolves.toEqual({
      message: "Не удалось сохранить профиль в базе данных",
    });
  });
});

function createToken(payload: Record<string, unknown> = {}): string {
  return jwt.sign(
    {
      sub: "user-1",
      name: "Alex",
      role: "user",
      phoneVerified: false,
      ...payload,
    },
    process.env.JWT_SECRET ?? "local-development-secret"
  );
}

function createRequest(
  token: string,
  body: Record<string, unknown>,
  url = "http://localhost/api/profile",
  headers: Record<string, string> = {}
): Request {
  return new Request(url, {
    method: "PATCH",
    headers: {
      cookie: `biketrips_session=${encodeURIComponent(token)}`,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}
