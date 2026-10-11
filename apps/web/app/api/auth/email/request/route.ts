import { NextResponse } from "next/server";

import { getServerApiUrl } from "../../../../lib/server-api-url";
import { getApiErrorMessage } from "../../../../lib/api-error-message";

const apiUrl = getServerApiUrl();

export async function POST(request: Request) {
  const payload: unknown = await request.json().catch(() => null);

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ message: "Укажите адрес электронной почты" }, { status: 400 });
  }

  // nginx sets X-Real-IP to the visitor's address; the API uses it for per-address limits.
  const realIp = request.headers.get("x-real-ip");
  const apiResponse = await fetch(`${apiUrl}/auth/email/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(realIp ? { "X-Real-IP": realIp } : {}),
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  }).catch(() => null);

  if (!apiResponse) {
    return NextResponse.json({ message: "Сервис авторизации недоступен" }, { status: 503 });
  }

  const result = await apiResponse.json().catch(() => null);

  if (!apiResponse.ok) {
    return NextResponse.json(
      { message: getApiErrorMessage(result, "Не удалось отправить код") },
      { status: apiResponse.status },
    );
  }

  return NextResponse.json(result ?? { ok: true });
}
