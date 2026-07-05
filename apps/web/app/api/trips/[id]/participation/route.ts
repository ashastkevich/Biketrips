import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const authCookieName = "biketrips_session";

interface ParticipationRouteProps {
  params: Promise<{ id: string }>;
}

async function proxyParticipation(
  method: "GET" | "POST" | "DELETE",
  { params }: ParticipationRouteProps,
) {
  const token = (await cookies()).get(authCookieName)?.value;
  if (!token) {
    return NextResponse.json({ message: "Требуется авторизация" }, { status: 401 });
  }

  const { id } = await params;
  const suffix = method === "GET"
    ? "participation"
    : method === "DELETE"
      ? "participants/me"
      : "participants";
  const response = await fetch(`${apiUrl}/trips/${encodeURIComponent(id)}/${suffix}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
    },
    body: method === "POST" ? "{}" : undefined,
    cache: "no-store",
  }).catch(() => null);

  if (!response) {
    return NextResponse.json({ message: "Сервис поездок недоступен" }, { status: 503 });
  }

  const body = await response.json().catch(() => null);
  return NextResponse.json(body, { status: response.status });
}

export function GET(_: Request, context: ParticipationRouteProps) {
  return proxyParticipation("GET", context);
}

export function POST(_: Request, context: ParticipationRouteProps) {
  return proxyParticipation("POST", context);
}

export function DELETE(_: Request, context: ParticipationRouteProps) {
  return proxyParticipation("DELETE", context);
}
