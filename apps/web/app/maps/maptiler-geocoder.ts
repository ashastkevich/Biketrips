import type { Geocoder, GeocodingResult, MapPoint } from "./map-types";
import { isValidMapPoint } from "./map-types";

interface MapTilerFeature {
  center?: unknown;
  context?: unknown;
  place_name?: unknown;
  text?: unknown;
}

interface MapTilerContext {
  id?: unknown;
  text?: unknown;
}

interface MapTilerResponse {
  features?: unknown;
}

function getFeatureName(feature: MapTilerFeature): string {
  const fullName = (
    typeof feature.place_name === "string"
      ? feature.place_name
      : typeof feature.text === "string"
        ? feature.text
        : ""
  ).trim();
  const context = Array.isArray(feature.context)
    ? (feature.context as MapTilerContext[])
    : [];
  const countryEntry = context.find(
    (entry) =>
      typeof entry.id === "string" &&
      entry.id.startsWith("country.") &&
      typeof entry.text === "string",
  );
  const country =
    typeof countryEntry?.text === "string" ? countryEntry.text.trim() : undefined;

  return fullName
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part && !/^\d{5,6}$/.test(part) && part !== country)
    .join(", ");
}

function parseFeature(feature: MapTilerFeature): GeocodingResult | null {
  if (
    !Array.isArray(feature.center) ||
    feature.center.length < 2 ||
    typeof feature.center[0] !== "number" ||
    typeof feature.center[1] !== "number"
  ) {
    return null;
  }

  const point = { lng: feature.center[0], lat: feature.center[1] };
  const name = getFeatureName(feature);

  return name && isValidMapPoint(point) ? { name, point } : null;
}

export class MapTilerGeocoder implements Geocoder {
  constructor(private readonly apiKey: string) {}

  async reverse(point: MapPoint, signal?: AbortSignal): Promise<GeocodingResult | null> {
    if (!isValidMapPoint(point)) {
      throw new Error("Некорректные координаты");
    }

    const coordinates = `${point.lng},${point.lat}`;
    const url = new URL(
      `https://api.maptiler.com/geocoding/${encodeURIComponent(coordinates)}.json`
    );
    url.searchParams.set("key", this.apiKey);
    url.searchParams.set("language", "ru");
    url.searchParams.set("limit", "1");

    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`MapTiler geocoding failed: ${response.status}`);
    }

    const payload = (await response.json()) as MapTilerResponse;
    if (!Array.isArray(payload.features)) return null;

    for (const feature of payload.features) {
      if (!feature || typeof feature !== "object") continue;
      const result = parseFeature(feature as MapTilerFeature);
      if (result) return result;
    }

    return null;
  }
}
