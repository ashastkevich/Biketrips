import { NextResponse } from "next/server";

import { isValidMapPoint, type AddressSuggestion, type MapPoint } from "../../../maps/map-types";

interface DadataAddressData {
  fias_id?: unknown;
  geo_lat?: unknown;
  geo_lon?: unknown;
}

interface DadataSuggestion {
  value?: unknown;
  unrestricted_value?: unknown;
  data?: unknown;
}

interface DadataSuggestResponse {
  suggestions?: unknown;
}

function readQuery(request: Request): string {
  const { searchParams } = new URL(request.url);
  return (searchParams.get("query") ?? "").trim();
}

function readCoordinate(value: unknown): number | null {
  const coordinate =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(coordinate) ? coordinate : null;
}

function parseSuggestion(suggestion: DadataSuggestion): AddressSuggestion | null {
  const name = (
    typeof suggestion.value === "string"
      ? suggestion.value
      : typeof suggestion.unrestricted_value === "string"
        ? suggestion.unrestricted_value
        : ""
  ).trim();
  if (!name || !suggestion.data || typeof suggestion.data !== "object") return null;

  const data = suggestion.data as DadataAddressData;
  const lat = readCoordinate(data.geo_lat);
  const lng = readCoordinate(data.geo_lon);
  const point: MapPoint | null = lat === null || lng === null ? null : { lat, lng };
  if (!point || !isValidMapPoint(point)) return null;

  const id =
    typeof data.fias_id === "string" && data.fias_id.trim()
      ? data.fias_id.trim()
      : `${name}:${point.lat}:${point.lng}`;

  return { id, name, point };
}

function readSuggestions(payload: DadataSuggestResponse): AddressSuggestion[] {
  if (!Array.isArray(payload.suggestions)) return [];

  const results: AddressSuggestion[] = [];
  const seen = new Set<string>();

  for (const suggestion of payload.suggestions) {
    if (!suggestion || typeof suggestion !== "object") continue;
    const result = parseSuggestion(suggestion as DadataSuggestion);
    if (!result || seen.has(result.id)) continue;

    seen.add(result.id);
    results.push(result);
  }

  return results;
}

export async function GET(request: Request) {
  const query = readQuery(request);
  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const token = process.env.DADATA_API_KEY?.trim();
  if (!token) {
    return NextResponse.json(
      { message: "Геокодер DaData не настроен. Добавьте DADATA_API_KEY в apps/web/.env.local." },
      { status: 503 }
    );
  }

  const response = await fetch(
    "https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Token ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        query,
        count: 5,
        language: "ru",
      }),
      cache: "no-store",
    }
  ).catch(() => null);

  if (!response?.ok) {
    return NextResponse.json(
      { message: "Не удалось найти адрес" },
      { status: response?.status ?? 503 }
    );
  }

  const payload = (await response.json().catch(() => null)) as DadataSuggestResponse | null;

  return NextResponse.json({
    results: payload ? readSuggestions(payload) : [],
  });
}
