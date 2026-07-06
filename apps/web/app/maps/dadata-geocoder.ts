import type { Geocoder, GeocodingResult, MapPoint } from "./map-types";
import { isValidMapPoint } from "./map-types";

interface ReverseGeocodingResponse {
  result?: unknown;
}

interface ReverseGeocodingResult {
  name?: unknown;
  point?: unknown;
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

export class DadataGeocoder implements Geocoder {
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
      const message = typeof payload?.message === "string"
        ? payload.message
        : `DaData geocoding failed: ${response.status}`;
      throw new Error(message);
    }

    const payload = (await response.json()) as ReverseGeocodingResponse;
    return parseResult(payload);
  }
}
