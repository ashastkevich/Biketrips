import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const authCookieName = "biketrips_session";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = (await cookies()).get(authCookieName)?.value;
  if (!token) {
    return NextResponse.json({ message: "Требуется авторизация" }, { status: 401 });
  }

  const { id } = await params;
  const response = await fetch(
    `${apiUrl}/trips/${encodeURIComponent(id)}/cancel`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  ).catch(() => null);

  if (!response) {
    return NextResponse.json({ message: "Сервис поездок недоступен" }, { status: 503 });
  }

  const body = await response.json().catch(() => null);
  return NextResponse.json(body, { status: response.status });
}
