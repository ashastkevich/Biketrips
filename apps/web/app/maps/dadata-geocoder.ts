import type { AddressSuggestion, Geocoder, GeocodingResult, MapPoint } from "./map-types";
import { isValidMapPoint } from "./map-types";

interface ReverseGeocodingResponse {
  result?: unknown;
}

interface SuggestGeocodingResponse {
  results?: unknown;
}

interface ReverseGeocodingResult {
  name?: unknown;
  point?: unknown;
}

interface SuggestGeocodingResult extends ReverseGeocodingResult {
  id?: unknown;
}

function parseResult(payload: ReverseGeocodingResponse): GeocodingResult | null {
  const result = payload.result as ReverseGeocodingResult | null | undefined;
  if (!result || typeof result.name !== "string") return null;

  const point = result.point;
  if (
    !point ||
    typeof point !== "object" ||
    typeof (point as MapPoint).lat !== "number" ||
    typeof (point as MapPoint).lng !== "number" ||
    !isValidMapPoint(point as MapPoint)
  ) {
    return null;
  }

  const name = result.name.trim();
  return name ? { name, point: point as MapPoint } : null;
}

function parseSuggestion(result: SuggestGeocodingResult): AddressSuggestion | null {
  if (typeof result.name !== "string") return null;

  const point = result.point;
  if (
    !point ||
    typeof point !== "object" ||
    typeof (point as MapPoint).lat !== "number" ||
    typeof (point as MapPoint).lng !== "number" ||
    !isValidMapPoint(point as MapPoint)
  ) {
    return null;
  }

  const name = result.name.trim();
  if (!name) return null;

  const validPoint = point as MapPoint;

  return {
    id:
      typeof result.id === "string" && result.id.trim()
        ? result.id.trim()
        : `${name}:${validPoint.lat}:${validPoint.lng}`,
    name,
    point: validPoint,
  };
}

function parseSuggestions(payload: SuggestGeocodingResponse): AddressSuggestion[] {
  if (!Array.isArray(payload.results)) return [];

  return payload.results
    .filter((result): result is SuggestGeocodingResult =>
      Boolean(result && typeof result === "object")
    )
    .map(parseSuggestion)
    .filter((result): result is AddressSuggestion => Boolean(result));
}

export class DadataGeocoder implements Geocoder {
  async suggest(query: string, signal?: AbortSignal): Promise<AddressSuggestion[]> {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) return [];

    const url = new URL("/api/geocode/suggest", window.location.origin);
    url.searchParams.set("query", trimmedQuery);

    const response = await fetch(url, { signal });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: unknown } | null;
      const message =
        typeof payload?.message === "string"
          ? payload.message
          : `DaData suggestions failed: ${response.status}`;
      throw new Error(message);
    }

    return parseSuggestions((await response.json()) as SuggestGeocodingResponse);
  }

  async reverse(point: MapPoint, signal?: AbortSignal): Promise<GeocodingResult | null> {
    if (!isValidMapPoint(point)) {
      throw new Error("Некорректные координаты");
    }

    const url = new URL("/api/geocode/reverse", window.location.origin);
    url.searchParams.set("lat", String(point.lat));
    url.searchParams.set("lng", String(point.lng));

    const response = await fetch(url, { signal });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: unknown } | null;
      const message =
        typeof payload?.message === "string"
          ? payload.message
          : `DaData geocoding failed: ${response.status}`;
      throw new Error(message);
    }

    const payload = (await response.json()) as ReverseGeocodingResponse;
    return parseResult(payload);
  }
}
