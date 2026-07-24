"use client";

import maplibregl, { type Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useMemo, useRef } from "react";

import { getMapStyleUrl } from "./map-config";
import { parseGpxRoute } from "./gpx";
import styles from "./interactive-map.module.css";

interface GpxRouteMapProps {
  apiKey: string;
  gpxContent: string;
  fileName: string | null;
  onError?: () => void;
}

export default function GpxRouteMap({
  apiKey,
  gpxContent,
  fileName,
  onError,
}: GpxRouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const route = useMemo(() => parseGpxRoute(gpxContent), [gpxContent]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !route) return;

    const firstPoint = route.points[0]!;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getMapStyleUrl(apiKey),
      center: [firstPoint.lng, firstPoint.lat],
      zoom: 11,
      attributionControl: false,
      cooperativeGestures: true,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
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
      map.fitBounds(
        [
          [route.bounds.west, route.bounds.south],
          [route.bounds.east, route.bounds.north],
        ],
        { padding: 38, maxZoom: 15, duration: 0 },
      );
    });
    map.on("error", () => onError?.());
    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [apiKey, onError, route]);

  if (!route) {
    return (
      <div className={styles.state} role="status">
        Не удалось прочитать координаты из GPX.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={styles.canvas}
      role="application"
      aria-label={fileName ? `Карта маршрута из файла ${fileName}` : "Карта маршрута"}
    />
  );
}
