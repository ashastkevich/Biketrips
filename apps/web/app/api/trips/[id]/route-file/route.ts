import { NextResponse } from "next/server";

import { getServerApiUrl } from "../../../../lib/server-api-url";

const apiUrl = getServerApiUrl();

/**
 * The API serves GPX files of unpublished or finished trips only to their organizer and admins,
 * so the browser fetches them here, where the session cookie becomes a bearer token.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = request.headers.get("cookie")
    ?.match(/(?:^|;\s*)biketrips_session=([^;]+)/)?.[1];
  // The organizer can replace the file under the same URL, so it is never cached.
  const response = await fetch(
    `${apiUrl}/trips/${encodeURIComponent(id)}/route-file`,
    token
      ? { headers: { authorization: `Bearer ${token}` }, cache: "no-store" }
      : { cache: "no-store" },
  ).catch(() => null);

  if (!response) {
    return NextResponse.json({ message: "Сервис поездок недоступен" }, { status: 503 });
  }

  if (!response.ok) {
    return NextResponse.json({ message: "GPX-файл не найден" }, { status: response.status });
  }

  const headers = new Headers({ "cache-control": "private, no-store" });
  const contentType = response.headers.get("content-type");
  const contentDisposition = response.headers.get("content-disposition");
  if (contentType) headers.set("content-type", contentType);
  if (contentDisposition) headers.set("content-disposition", contentDisposition);

  return new Response(response.body, { headers, status: response.status });
}
