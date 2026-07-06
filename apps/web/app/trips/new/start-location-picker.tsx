"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { DadataGeocoder } from "../../maps/dadata-geocoder";
import { InteractiveMapLoader } from "../../maps/interactive-map-loader";
import { DEFAULT_MAP_CENTER, getMapTilerApiKey } from "../../maps/map-config";
import {
  formatCoordinate,
  formatPoint,
  isValidMapPoint,
  type MapPoint,
} from "../../maps/map-types";

interface StartLocationValue {
  name: string;
  lat: string;
  lng: string;
}

interface StartLocationPickerProps {
  value: StartLocationValue;
  onChange: (value: StartLocationValue) => void;
}

function readPoint(value: StartLocationValue): MapPoint | null {
  if (!value.lat || !value.lng) return null;
  const point = { lat: Number(value.lat), lng: Number(value.lng) };
  return isValidMapPoint(point) ? point : null;
}

export function StartLocationPicker({ value, onChange }: StartLocationPickerProps) {
  const apiKey = getMapTilerApiKey();
  const geocoder = useMemo(() => (apiKey ? new DadataGeocoder() : null), [apiKey]);
  const selectedPoint = readPoint(value);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodingError, setGeocodingError] = useState("");
  const [mapError, setMapError] = useState("");
  const requestRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    []
  );

  async function selectPoint(point: MapPoint) {
    const normalizedPoint = {
      lat: Number(formatCoordinate(point.lat)),
      lng: Number(formatCoordinate(point.lng)),
    };
    const fallbackName = formatPoint(normalizedPoint);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestRef.current;

    setGeocodingError("");
    setIsGeocoding(true);
    onChange({
      name: fallbackName,
      lat: formatCoordinate(normalizedPoint.lat),
      lng: formatCoordinate(normalizedPoint.lng),
    });

    try {
      const result = await geocoder?.reverse(normalizedPoint, controller.signal);
      if (requestId !== requestRef.current) return;
      if (!result) throw new Error("Адрес не найден");

      onChange({
        name: result.name,
        lat: formatCoordinate(normalizedPoint.lat),
        lng: formatCoordinate(normalizedPoint.lng),
      });
    } catch (error) {
      if (controller.signal.aborted || requestId !== requestRef.current) return;
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Не удалось определить адрес. Координаты сохранены.";
      setGeocodingError(message);
    } finally {
      if (requestId === requestRef.current) setIsGeocoding(false);
    }
  }

  if (!apiKey) {
    return (
      <div className="start-location-picker">
        <div className="start-location-map__state start-location-map__state--error" role="alert">
          Карта не настроена. Добавьте NEXT_PUBLIC_MAPTILER_API_KEY в apps/web/.env.local.
        </div>
      </div>
    );
  }

  return (
    <div className="start-location-picker">
      <div className="start-location-picker__header">
        <div aria-live="polite">
          <span className="start-location-picker__label">Адрес точки старта</span>
          <strong>
            {isGeocoding
              ? "Определяем адрес…"
              : selectedPoint
                ? value.name
                : "Кликните по карте, чтобы поставить точку"}
          </strong>
          {selectedPoint ? <small>{formatPoint(selectedPoint)}</small> : null}
        </div>
        <span className="start-location-picker__badge">DaData</span>
      </div>

      <div className="start-location-map">
        <InteractiveMapLoader
          apiKey={apiKey}
          center={DEFAULT_MAP_CENTER}
          point={selectedPoint}
          onError={() => setMapError("Не удалось загрузить данные карты. Попробуйте ещё раз.")}
          onSelect={(point) => void selectPoint(point)}
        />
      </div>

      {geocodingError && selectedPoint ? (
        <button
          type="button"
          className="start-location-picker__retry"
          onClick={() => void selectPoint(selectedPoint)}
        >
          Повторить определение адреса
        </button>
      ) : null}

      {geocodingError ? (
        <p className="start-location-picker__warning" role="alert">
          {geocodingError}
        </p>
      ) : null}
      {mapError ? (
        <p className="start-location-picker__warning" role="alert">
          {mapError}
        </p>
      ) : null}
    </div>
  );
}
