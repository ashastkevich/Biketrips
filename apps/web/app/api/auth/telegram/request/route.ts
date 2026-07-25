import { NextResponse } from "next/server";

import { getServerApiUrl } from "../../../../lib/server-api-url";

const apiUrl = getServerApiUrl();
const authCookieName = "biketrips_session";

function getSessionToken(request: Request): string | null {
  const cookie = request.headers.get("cookie");
  const token = cookie?.match(new RegExp(`(?:^|;\\s*)${authCookieName}=([^;]+)`))?.[1];

  return token ? decodeURIComponent(token) : null;
}

export async function POST(request: Request) {
  const sessionToken = getSessionToken(request);
  const apiResponse = await fetch(`${apiUrl}/auth/telegram/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
    },
    body: "{}",
    cache: "no-store",
  }).catch(() => null);

  if (!apiResponse) {
    return NextResponse.json({ message: "Сервис авторизации недоступен" }, { status: 503 });
  }

  const result = await apiResponse.json().catch(() => null);

  if (!apiResponse.ok) {
    return NextResponse.json(
      { message: getApiMessage(result, "Не удалось начать вход через Telegram") },
      { status: apiResponse.status },
    );
  }

  return NextResponse.json(result);
}

function getApiMessage(result: unknown, fallback: string): string {
  if (!result || typeof result !== "object" || !("message" in result)) return fallback;
  const message = result.message;
  return typeof message === "string" ? message : fallback;
}
