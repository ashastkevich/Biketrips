import type { GpxRoute } from "./gpx";
import { distanceMeters, type MapPoint } from "./map-types";

/**
 * A meeting point further than this from the start of the GPX track is unusual (a train ride to
 * the route, or a wrong address or file), so the organizer has to confirm and explain it.
 */
export const FAR_ROUTE_START_METERS = 5000;

/** Closer than this, the meeting point and the track start read as one place. */
const SAME_PLACE_METERS = 50;
/** A track whose ends are this close is a loop, so no separate finish marker is shown. */
const LOOP_METERS = 150;

export function getRouteStartDistance(start: MapPoint | null, route: GpxRoute | null): number | null {
  if (!start || !route) return null;
  return distanceMeters(start, route.points[0]!);
}

export function isFarRouteStart(distance: number | null): boolean {
  return distance !== null && distance > FAR_ROUTE_START_METERS;
}

export function isSamePlace(distance: number): boolean {
  return distance < SAME_PLACE_METERS;
}

export function isLoopRoute(route: GpxRoute): boolean {
  return distanceMeters(route.points[0]!, route.points[route.points.length - 1]!) <= LOOP_METERS;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} м`;
  if (meters < 10_000) return `${(Math.round(meters / 100) / 10).toLocaleString("ru-RU")} км`;
  return `${Math.round(meters / 1000)} км`;
}
