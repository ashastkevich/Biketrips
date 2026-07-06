"use client";

import maplibregl, { type Map as MapLibreMap, type Marker } from "maplibre-gl";
import { useEffect, useRef } from "react";

import { DEFAULT_MAP_ZOOM, getMapStyleUrl } from "./map-config";
import type { MapPoint } from "./map-types";

interface InteractiveMapProps {
  apiKey: string;
  center: MapPoint;
  point: MapPoint | null;
  onError: () => void;
  onSelect: (point: MapPoint) => void;
}

export default function InteractiveMap({
  apiKey,
  center,
  point,
  onError,
  onSelect,
}: InteractiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const centerRef = useRef(center);
  const onErrorRef = useRef(onError);
  const onSelectRef = useRef(onSelect);
  const pointRef = useRef(point);

  onErrorRef.current = onError;
  onSelectRef.current = onSelect;
  pointRef.current = point;
  centerRef.current = center;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialCenter = pointRef.current ?? centerRef.current;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getMapStyleUrl(apiKey),
      center: [initialCenter.lng, initialCenter.lat],
      zoom: pointRef.current ? 14 : DEFAULT_MAP_ZOOM,
      attributionControl: false,
      cooperativeGestures: true,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.on("click", (event) => {
      onSelectRef.current({ lat: event.lngLat.lat, lng: event.lngLat.lng });
    });
    map.on("error", () => onErrorRef.current());
    mapRef.current = map;

    if (pointRef.current) {
      const element = document.createElement("div");
      element.className = "start-location-map__marker";
      element.setAttribute("aria-hidden", "true");
      markerRef.current = new maplibregl.Marker({ element, anchor: "bottom" })
        .setLngLat([pointRef.current.lng, pointRef.current.lat])
        .addTo(map);
    }

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [apiKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!point) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    if (!markerRef.current) {
      const element = document.createElement("div");
      element.className = "start-location-map__marker";
      element.setAttribute("aria-hidden", "true");
      markerRef.current = new maplibregl.Marker({ element, anchor: "bottom" })
        .setLngLat([point.lng, point.lat])
        .addTo(map);
    }

    markerRef.current.setLngLat([point.lng, point.lat]);
  }, [point]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || pointRef.current) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.easeTo({
      center: [center.lng, center.lat],
      zoom: DEFAULT_MAP_ZOOM,
      duration: reducedMotion ? 0 : 500,
    });
  }, [center]);

  return (
    <div
      ref={containerRef}
      className="start-location-map__canvas"
      role="application"
      aria-label="Интерактивная карта выбора точки старта"
    />
  );
}
