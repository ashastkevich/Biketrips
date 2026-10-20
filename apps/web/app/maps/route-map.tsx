"use client";

import { maplibregl } from "./maplibre";
import type { LngLatBoundsLike, Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";

import { getMapStyleUrl } from "./map-config";
import type { GpxRoute } from "./gpx";
import type { MapPoint } from "./map-types";
import { getRouteStartDistance, isFarRouteStart, isLoopRoute, isSamePlace } from "./route-start";
import styles from "./interactive-map.module.css";

const START_ONLY_ZOOM = 15;
const mapLocale = {
  "CooperativeGesturesHandler.WindowsHelpText": "Чтобы изменить масштаб, прокручивайте с зажатым Ctrl",
  "CooperativeGesturesHandler.MacHelpText": "Чтобы изменить масштаб, прокручивайте с зажатым ⌘",
  "CooperativeGesturesHandler.MobileHelpText": "Перемещайте карту двумя пальцами",
};

interface RouteMapProps {
  apiKey: string;
  /** The meeting point the organizer picked. */
  start: MapPoint | null;
  route: GpxRoute | null;
  label: string;
}

function createMarkerElement(className: string | undefined, title: string): HTMLDivElement {
  const element = document.createElement("div");
  element.className = className ?? "";
  element.title = title;
  element.setAttribute("aria-hidden", "true");
  return element;
}

function getRouteBounds(route: GpxRoute, start: MapPoint | null): LngLatBoundsLike {
  const { bounds } = route;
  return [
    [Math.min(bounds.west, start?.lng ?? bounds.west), Math.min(bounds.south, start?.lat ?? bounds.south)],
    [Math.max(bounds.east, start?.lng ?? bounds.east), Math.max(bounds.north, start?.lat ?? bounds.north)],
  ];
}

export default function RouteMap({ apiKey, start, route, label }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startLat = start?.lat ?? null;
  const startLng = start?.lng ?? null;

  useEffect(() => {
    const meetingPoint = startLat !== null && startLng !== null ? { lat: startLat, lng: startLng } : null;
    const center = meetingPoint ?? route?.points[0];
    if (!containerRef.current || !center) return;

    const map: MapLibreMap = new maplibregl.Map({
      container: containerRef.current,
      style: getMapStyleUrl(apiKey),
      center: [center.lng, center.lat],
      zoom: route ? 11 : START_ONLY_ZOOM,
      attributionControl: false,
      cooperativeGestures: true,
      locale: mapLocale,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    const markers: Marker[] = [];
    function addMarker(point: MapPoint, className: string | undefined, title: string) {
      markers.push(
        new maplibregl.Marker({
          element: createMarkerElement(className, title),
          anchor: className === styles.marker ? "bottom" : "center",
        })
          .setLngLat([point.lng, point.lat])
          .addTo(map),
      );
    }

    if (route) {
      const routeStart = route.points[0]!;
      const routeStartDistance = getRouteStartDistance(meetingPoint, route);
      const isFar = isFarRouteStart(routeStartDistance);
      const showApproach =
        meetingPoint !== null && routeStartDistance !== null && !isFar && !isSamePlace(routeStartDistance);

      // Added first so the meeting point pin stays on top when the markers overlap.
      if (!isLoopRoute(route)) {
        addMarker(route.points[route.points.length - 1]!, styles.finishMarker, "Финиш маршрута");
      }
      if (!meetingPoint || routeStartDistance === null || !isSamePlace(routeStartDistance)) {
        addMarker(routeStart, styles.routeStartMarker, "Начало маршрута");
      }

      map.on("load", () => {
        map.addSource("gpx-route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: route.points.map((point) => [point.lng, point.lat]),
            },
          },
        });
        map.addLayer({
          id: "gpx-route-shadow",
          type: "line",
          source: "gpx-route",
          paint: {
            "line-color": "#ffffff",
            "line-width": 8,
            "line-opacity": 0.82,
          },
        });
        map.addLayer({
          id: "gpx-route-line",
          type: "line",
          source: "gpx-route",
          paint: {
            "line-color": "#355f23",
            "line-width": 4,
          },
        });
        if (showApproach) {
          map.addSource("route-approach", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: [
                  [meetingPoint.lng, meetingPoint.lat],
                  [routeStart.lng, routeStart.lat],
                ],
              },
            },
          });
          map.addLayer({
            id: "route-approach-line",
            type: "line",
            source: "route-approach",
            layout: { "line-cap": "round" },
            paint: {
              "line-color": "#355f23",
              "line-width": 3,
              "line-dasharray": [0.5, 2],
            },
          });
        }
      });
      // A far meeting point would shrink the route to a few pixels, so the map frames the route
      // alone and the page explains the distance in text.
      map.fitBounds(getRouteBounds(route, isFar ? null : meetingPoint), {
        padding: 42,
        maxZoom: 15,
        duration: 0,
      });
    }

    addMarker(meetingPoint ?? route!.points[0]!, styles.marker, "Место сбора");

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      markers.forEach((marker) => marker.remove());
      map.remove();
    };
  }, [apiKey, route, startLat, startLng]);

  return (
    <div
      ref={containerRef}
      className={`${styles.canvas} ${styles.viewCanvas}`}
      role="application"
      aria-label={label}
    />
  );
}
