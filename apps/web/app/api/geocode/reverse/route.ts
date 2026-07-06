import { NextResponse } from "next/server";

import { isValidMapPoint, type MapPoint } from "../../../maps/map-types";

interface DadataSuggestion {
  value?: unknown;
  unrestricted_value?: unknown;
}

interface DadataGeolocateResponse {
  suggestions?: unknown;
}

function readPoint(request: Request): MapPoint | null {
  const { searchParams } = new URL(request.url);
  const point = {
    lat: Number(searchParams.get("lat")),
    lng: Number(searchParams.get("lng")),
  };

  return isValidMapPoint(point) ? point : null;
}

function readAddress(payload: DadataGeolocateResponse): string | null {
  if (!Array.isArray(payload.suggestions)) return null;

  for (const suggestion of payload.suggestions) {
    if (!suggestion || typeof suggestion !== "object") continue;
    const { value, unrestricted_value: unrestrictedValue } = suggestion as DadataSuggestion;
    const name =
      typeof value === "string"
        ? value.trim()
        : typeof unrestrictedValue === "string"
          ? unrestrictedValue.trim()
          : "";
    if (name) return name;
  }

  return null;
}

export async function GET(request: Request) {
  const point = readPoint(request);
  if (!point) {
    return NextResponse.json({ message: "Некорректные координаты" }, { status: 400 });
  }

  const token = process.env.DADATA_API_KEY?.trim();
  if (!token) {
    return NextResponse.json(
      { message: "Геокодер DaData не настроен. Добавьте DADATA_API_KEY в apps/web/.env.local." },
      { status: 503 },
    );
  }

  const response = await fetch(
    "https://suggestions.dadata.ru/suggestions/api/4_1/rs/geolocate/address",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Token ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        lat: point.lat,
        lon: point.lng,
        count: 1,
        radius_meters: 150,
        language: "ru",
      }),
      cache: "no-store",
    },
  ).catch(() => null);

  if (!response?.ok) {
    return NextResponse.json(
      { message: "Не удалось определить адрес" },
      { status: response?.status ?? 503 },
    );
  }

  const payload = (await response.json().catch(() => null)) as DadataGeolocateResponse | null;
  const name = payload ? readAddress(payload) : null;

  return NextResponse.json({
    result: name ? { name, point } : null,
  });
}
