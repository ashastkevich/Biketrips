import { NextResponse } from "next/server";

import { getServerApiUrl } from "../../../lib/server-api-url";
import { isSecureRequest } from "../session-cookie";

const apiUrl = getServerApiUrl();
const authCookieName = "biketrips_session";

function getSessionToken(request: Request): string | null {
  const cookie = request.headers.get("cookie");
  const token = cookie?.match(new RegExp(`(?:^|;\\s*)${authCookieName}=([^;]+)`))?.[1];

  return token ? decodeURIComponent(token) : null;
}

export async function POST(request: Request) {
  const payload: unknown = await request.json().catch(() => null);

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ message: "Некорректный ответ Telegram" }, { status: 400 });
  }

  const sessionToken = getSessionToken(request);
  const apiResponse = await fetch(`${apiUrl}/auth/telegram`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
    },
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
    secure: isSecureRequest(request),
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  return response;
}
