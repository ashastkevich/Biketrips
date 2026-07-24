import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

import { isSecureRequest } from "../auth/session-cookie";

const authCookieName = "biketrips_session";

export async function PATCH(request: Request) {
  const token = request.headers.get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${authCookieName}=`))
    ?.slice(authCookieName.length + 1);

  if (!token) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  }

  let payload: jwt.JwtPayload;

  try {
    const verified = jwt.verify(
      decodeURIComponent(token),
      process.env.JWT_SECRET ?? "local-development-secret",
    );

    if (typeof verified === "string" || typeof verified.sub !== "string") {
      throw new Error("Invalid session");
    }
    payload = verified;
  } catch {
    return NextResponse.json({ message: "Invalid session" }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as {
    name?: unknown;
    phone?: unknown;
    telegram?: unknown;
    email?: unknown;
    cityId?: unknown;
  } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const telegram = typeof body?.telegram === "string"
    ? body.telegram.trim().replace(/^@/, "")
    : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const cityId = typeof body?.cityId === "string" ? body.cityId.trim() : "";

  if (name.length < 2 || name.length > 80) {
    return NextResponse.json(
      { message: "Имя должно содержать от 2 до 80 символов" },
      { status: 400 },
    );
  }

  if (phone && !/^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/.test(phone)) {
    return NextResponse.json(
      { message: "Введите телефон в формате +7 (999) 000-00-00" },
      { status: 400 },
    );
  }

  if (email && !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(email)) {
    return NextResponse.json(
      { message: "Используйте латинские буквы и формат name@example.com" },
      { status: 400 },
    );
  }

  if (email.split("@")[1]?.split(".").some((label) => label.startsWith("xn--"))) {
    return NextResponse.json(
      { message: "Кириллические домены не поддерживаются" },
      { status: 400 },
    );
  }

  const apiResponse = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/users/${payload.sub}`,
    {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${decodeURIComponent(token)}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ name, email, phoneNumber: phone, cityId }),
      cache: "no-store",
    },
  ).catch(() => null);

  if (!apiResponse?.ok) {
    const apiError = await apiResponse?.json().catch(() => null) as { message?: string } | null;
    return NextResponse.json(
      { message: apiError?.message ?? "Не удалось сохранить профиль в базе данных" },
      { status: apiResponse?.status ?? 503 },
    );
  }
  const databaseUser = await apiResponse.json() as {
    cityId: string | null;
    city: { name: string } | null;
  };

  const updatedToken = jwt.sign(
    {
      sub: payload.sub,
      name,
      role: payload.role === "admin" ? "admin" : "user",
      phoneVerified: payload.phoneVerified === true && phone === payload.phone,
      phone,
      telegram,
      email,
      telegramVerified: payload.telegramVerified === true && telegram === payload.telegram,
      emailVerified: payload.emailVerified === true && email === payload.email,
      cityId: databaseUser.cityId ?? "",
      city: databaseUser.city?.name ?? "",
    },
    process.env.JWT_SECRET ?? "local-development-secret",
    { expiresIn: "7d" },
  );
  const response = NextResponse.json({
    name,
    phone,
    telegram,
    email,
    cityId: databaseUser.cityId ?? "",
    city: databaseUser.city?.name ?? "",
  });
  response.cookies.set(authCookieName, updatedToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureRequest(request),
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  return response;
}
