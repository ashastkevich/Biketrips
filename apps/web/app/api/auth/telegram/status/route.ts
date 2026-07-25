import { NextResponse } from "next/server";

import { getServerApiUrl } from "../../../../lib/server-api-url";
import { isSecureRequest } from "../../session-cookie";

const apiUrl = getServerApiUrl();
const authCookieName = "biketrips_session";

export async function POST(request: Request) {
  const payload: unknown = await request.json().catch(() => null);

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ message: "Некорректный запрос входа" }, { status: 400 });
  }

  const apiResponse = await fetch(`${apiUrl}/auth/telegram/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  }).catch(() => null);

  if (!apiResponse) {
    return NextResponse.json({ message: "Сервис авторизации недоступен" }, { status: 503 });
  }

  const result = (await apiResponse.json().catch(() => null)) as
    | { status?: string; accessToken?: string; tokenType?: string; message?: string }
    | null;

  if (!apiResponse.ok) {
    return NextResponse.json(
      { message: result?.message ?? "Не удалось проверить вход через Telegram" },
      { status: apiResponse.status },
    );
  }

  if (result?.status !== "confirmed" || !result.accessToken) {
    return NextResponse.json(result ?? { status: "pending" });
  }

  const response = NextResponse.json({ ok: true, status: "confirmed" });
  response.cookies.set(authCookieName, result.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureRequest(request),
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  return response;
}
