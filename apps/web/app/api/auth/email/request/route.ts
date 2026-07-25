import { NextResponse } from "next/server";

import { getServerApiUrl } from "../../../../lib/server-api-url";

const apiUrl = getServerApiUrl();

export async function POST(request: Request) {
  const payload: unknown = await request.json().catch(() => null);

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ message: "Укажите адрес электронной почты" }, { status: 400 });
  }

  const apiResponse = await fetch(`${apiUrl}/auth/email/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  }).catch(() => null);

  if (!apiResponse) {
    return NextResponse.json({ message: "Сервис авторизации недоступен" }, { status: 503 });
  }

  const result = await apiResponse.json().catch(() => null);

  if (!apiResponse.ok) {
    return NextResponse.json(
      { message: getApiMessage(result, "Не удалось отправить код") },
      { status: apiResponse.status },
    );
  }

  return NextResponse.json(result ?? { ok: true });
}

function getApiMessage(result: unknown, fallback: string): string {
  if (!result || typeof result !== "object" || !("message" in result)) return fallback;
  const message = result.message;
  return typeof message === "string" ? message : fallback;
}
