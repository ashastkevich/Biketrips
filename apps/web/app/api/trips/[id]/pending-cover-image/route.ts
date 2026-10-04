import { NextResponse } from "next/server";

import { getServerApiUrl } from "../../../../lib/server-api-url";

const apiUrl = getServerApiUrl();
const authCookieName = "biketrips_session";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = request.headers.get("cookie")
    ?.match(new RegExp(`(?:^|;\\s*)${authCookieName}=([^;]+)`))?.[1];
  if (!token) return NextResponse.json({ message: "Требуется вход" }, { status: 401 });

  const { search } = new URL(request.url);
  const response = await fetch(
    `${apiUrl}/trips/${encodeURIComponent(id)}/pending-cover-image${search}`,
    {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  ).catch(() => null);

  if (!response) {
    return NextResponse.json({ message: "Сервис поездок недоступен" }, { status: 503 });
  }
  if (!response.ok) {
    return NextResponse.json({ message: "Обложка не найдена" }, { status: response.status });
  }

  return new Response(response.body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "image/webp",
      "cache-control": "private, no-store",
    },
  });
}
