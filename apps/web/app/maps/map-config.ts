import type { MapPoint } from "./map-types";

export const DEFAULT_MAP_CENTER: MapPoint = {
  lat: 55.751244,
  lng: 37.618423,
};

export const DEFAULT_MAP_ZOOM = 11;

export function getMapTilerApiKey(): string {
  return process.env.NEXT_PUBLIC_MAPTILER_API_KEY?.trim() ?? "";
}

export function getMapStyleUrl(apiKey: string): string {
  return `https://api.maptiler.com/maps/streets-v4/style.json?key=${encodeURIComponent(apiKey)}`;
}
