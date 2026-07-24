import type { MapBounds, MapPoint } from "./map-types";
import { isValidMapPoint } from "./map-types";

export interface GpxRoute {
  points: MapPoint[];
  bounds: MapBounds;
}

export function parseGpxRoute(content: string): GpxRoute | null {
  if (typeof DOMParser === "undefined") return null;

  const document = new DOMParser().parseFromString(content, "application/xml");
  if (document.querySelector("parsererror")) return null;

  const nodes = [
    ...Array.from(document.querySelectorAll("trkpt")),
    ...Array.from(document.querySelectorAll("rtept")),
  ];
  const points = nodes
    .map((node) => ({
      lat: Number(node.getAttribute("lat")),
      lng: Number(node.getAttribute("lon")),
    }))
    .filter(isValidMapPoint);

  if (points.length < 2) return null;

  return {
    points,
    bounds: points.reduce<MapBounds>(
      (bounds, point) => ({
        north: Math.max(bounds.north, point.lat),
        east: Math.max(bounds.east, point.lng),
        south: Math.min(bounds.south, point.lat),
        west: Math.min(bounds.west, point.lng),
      }),
      {
        north: points[0]!.lat,
        east: points[0]!.lng,
        south: points[0]!.lat,
        west: points[0]!.lng,
      },
    ),
  };
}
