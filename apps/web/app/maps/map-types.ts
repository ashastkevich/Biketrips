export interface MapPoint {
  lat: number;
  lng: number;
}

export interface MapBounds {
  north: number;
  east: number;
  south: number;
  west: number;
}

export interface GeocodingResult {
  name: string;
  point: MapPoint;
}

export interface AddressSuggestion extends GeocodingResult {
  id: string;
}

export interface Geocoder {
  reverse(point: MapPoint, signal?: AbortSignal): Promise<GeocodingResult | null>;
}

export function isValidMapPoint(point: MapPoint): boolean {
  return (
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    point.lat >= -90 &&
    point.lat <= 90 &&
    point.lng >= -180 &&
    point.lng <= 180
  );
}

export function formatCoordinate(value: number): string {
  return value.toFixed(6);
}

export function formatPoint(point: MapPoint): string {
  return `${formatCoordinate(point.lat)}, ${formatCoordinate(point.lng)}`;
}

const EARTH_RADIUS_METERS = 6_371_000;

/** Great-circle distance; accurate enough to tell whether two points are the same place. */
export function distanceMeters(from: MapPoint, to: MapPoint): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latDelta = toRadians(to.lat - from.lat);
  const lngDelta = toRadians(to.lng - from.lng);
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(lngDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
}
