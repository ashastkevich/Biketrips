"use client";

import type { MouseEvent } from "react";

interface StartLocationValue {
  name: string;
  lat: string;
  lng: string;
}

interface StartLocationPickerProps {
  city: string;
  value: StartLocationValue;
  onChange: (value: StartLocationValue) => void;
}

const cityCenters: Record<string, { lat: number; lng: number }> = {
  Москва: { lat: 55.751244, lng: 37.618423 },
  "Санкт-Петербург": { lat: 59.938784, lng: 30.314997 },
  Казань: { lat: 55.796127, lng: 49.106414 },
};

const defaultCityCenter = cityCenters["Москва"]!;

const mockStreets = [
  "Велосипедная улица",
  "Зелёный проспект",
  "Парковая аллея",
  "Набережная маршрута",
  "Лесной проезд",
  "Станционная площадь",
];

function formatCoordinate(value: number): string {
  return value.toFixed(6);
}

function getCityCenter(city: string) {
  return cityCenters[city] ?? defaultCityCenter;
}

function getPinPosition(city: string, lat: string, lng: string) {
  const center = getCityCenter(city);
  const latitude = Number(lat);
  const longitude = Number(lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { left: 50, top: 50 };
  }

  return {
    left: Math.min(92, Math.max(8, 50 + (longitude - center.lng) * 120)),
    top: Math.min(92, Math.max(8, 50 - (latitude - center.lat) * 170)),
  };
}

function getMockAddress(city: string, lat: number, lng: number): string {
  const streetIndex = Math.abs(Math.round((lat + lng) * 1000)) % mockStreets.length;
  const houseNumber = Math.max(1, Math.abs(Math.round((lat - lng) * 100)) % 84);
  const cityName = city || "Москва";

  return `${cityName}, ${mockStreets[streetIndex]}, ${houseNumber}`;
}

export function StartLocationPicker({ city, value, onChange }: StartLocationPickerProps) {
  const pinPosition = getPinPosition(city, value.lat, value.lng);
  const hasPoint = value.lat && value.lng;

  function selectPoint(name: string, lat: number, lng: number) {
    onChange({
      name,
      lat: formatCoordinate(lat),
      lng: formatCoordinate(lng),
    });
  }

  function handleMapClick(event: MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const center = getCityCenter(city);
    const lat = center.lat + (0.5 - y) * 0.42;
    const lng = center.lng + (x - 0.5) * 0.62;

    selectPoint(getMockAddress(city, lat, lng), lat, lng);
  }

  return (
    <div className="start-location-picker">
      <div className="start-location-picker__header">
        <div>
          <span className="start-location-picker__label">Адрес точки старта</span>
          <strong>{hasPoint ? value.name : "Кликните по карте, чтобы поставить пин"}</strong>
          {hasPoint ? <small>{value.lat}, {value.lng}</small> : null}
        </div>
        <span className="start-location-picker__badge">прототип карты</span>
      </div>

      <button
        type="button"
        className="start-location-map"
        aria-label="Выбрать точку старта на карте"
        onClick={handleMapClick}
      >
        <span className="start-location-map__grid" aria-hidden="true" />
        <span className="start-location-map__road start-location-map__road--primary" aria-hidden="true" />
        <span className="start-location-map__road start-location-map__road--secondary" aria-hidden="true" />
        <span className="start-location-map__park" aria-hidden="true" />
        <span
          className="start-location-map__pin"
          style={{ left: `${pinPosition.left}%`, top: `${pinPosition.top}%` }}
          aria-hidden="true"
        >
          <span />
        </span>
      </button>
    </div>
  );
}
