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
