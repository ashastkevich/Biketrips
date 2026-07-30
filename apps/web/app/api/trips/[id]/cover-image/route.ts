import { NextResponse } from "next/server";

import { getServerApiUrl } from "../../../../lib/server-api-url";

const apiUrl = getServerApiUrl();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { search } = new URL(request.url);
  const response = await fetch(
    `${apiUrl}/trips/${encodeURIComponent(id)}/cover-image${search}`,
    { next: { revalidate: 86400 } },
  ).catch(() => null);

  if (!response) {
    return NextResponse.json({ message: "Сервис поездок недоступен" }, { status: 503 });
  }

  if (!response.ok) {
    return NextResponse.json({ message: "Обложка не найдена" }, { status: response.status });
  }

  const headers = new Headers();
  const contentType = response.headers.get("content-type");
  const cacheControl = response.headers.get("cache-control");
  if (contentType) headers.set("content-type", contentType);
  if (cacheControl) headers.set("cache-control", cacheControl);

  return new Response(response.body, { headers, status: response.status });
}
