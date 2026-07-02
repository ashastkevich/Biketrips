import { NextResponse } from "next/server";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const authCookieName = "biketrips_session";

export async function POST(request: Request) {
  const payload: unknown = await request.json().catch(() => null);

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ message: "Некорректный ответ Telegram" }, { status: 400 });
  }

  const apiResponse = await fetch(`${apiUrl}/auth/telegram`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  }).catch(() => null);

  if (!apiResponse) {
    return NextResponse.json({ message: "Сервис авторизации недоступен" }, { status: 503 });
  }

  const result = (await apiResponse.json().catch(() => null)) as
    | { accessToken?: string; message?: string }
    | null;

  if (!apiResponse.ok || !result?.accessToken) {
    return NextResponse.json(
      { message: result?.message ?? "Не удалось войти через Telegram" },
      { status: apiResponse.status }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(authCookieName, result.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  return response;
}
