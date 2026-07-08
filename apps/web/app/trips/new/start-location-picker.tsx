"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

import { DadataGeocoder } from "../../maps/dadata-geocoder";
import { InteractiveMapLoader } from "../../maps/interactive-map-loader";
import { DEFAULT_MAP_CENTER, getMapTilerApiKey } from "../../maps/map-config";
import {
  formatCoordinate,
  formatPoint,
  isValidMapPoint,
  type AddressSuggestion,
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
  const inputId = useId();
  const listboxId = `${inputId}-suggestions`;
  const apiKey = getMapTilerApiKey();
  const geocoder = useMemo(() => new DadataGeocoder(), []);
  const selectedPoint = readPoint(value);
  const selectedPointKey = selectedPoint ? formatPoint(selectedPoint) : "";
  const [inputValue, setInputValue] = useState(value.name);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [hasOpenedMap, setHasOpenedMap] = useState(false);
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [suggestError, setSuggestError] = useState("");
  const [geocodingError, setGeocodingError] = useState("");
  const [mapError, setMapError] = useState("");
  const requestRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const suggestRequestRef = useRef(0);
  const suggestAbortRef = useRef<AbortController | null>(null);

  const trimmedInput = inputValue.trim();
  const hasUnconfirmedInput = Boolean(trimmedInput && !selectedPoint);
  const showSuggestions = suggestions.length > 0;
  const hintText = isGeocoding
    ? "Определяем адрес по точке на карте..."
    : isSuggesting
      ? "Ищем адрес..."
      : selectedPoint
        ? formatPoint(selectedPoint)
        : hasUnconfirmedInput
          ? "Выберите адрес из подсказок или откройте карту, чтобы поставить точку."
          : "Начните вводить адрес или откройте карту, чтобы поставить точку.";

  useEffect(
    () => () => {
      abortRef.current?.abort();
      suggestAbortRef.current?.abort();
    },
    []
  );

  useEffect(() => {
    setInputValue(value.name);
  }, [value.name]);

  useEffect(() => {
    const query = inputValue.trim();
    if (!geocoder || query.length < 3 || (selectedPointKey && query === value.name)) {
      suggestAbortRef.current?.abort();
      setSuggestions([]);
      setActiveSuggestionIndex(-1);
      setIsSuggesting(false);
      setSuggestError("");
      return;
    }

    const controller = new AbortController();
    suggestAbortRef.current?.abort();
    suggestAbortRef.current = controller;
    const requestId = ++suggestRequestRef.current;

    setIsSuggesting(true);
    setSuggestError("");

    const timeoutId = window.setTimeout(() => {
      void geocoder
        .suggest(query, controller.signal)
        .then((results) => {
          if (controller.signal.aborted || requestId !== suggestRequestRef.current) return;
          setSuggestions(results);
          setActiveSuggestionIndex(results.length ? 0 : -1);
        })
        .catch((error) => {
          if (controller.signal.aborted || requestId !== suggestRequestRef.current) return;
          setSuggestions([]);
          setActiveSuggestionIndex(-1);
          setSuggestError(
            error instanceof Error && error.message ? error.message : "Не удалось найти адрес."
          );
        })
        .finally(() => {
          if (requestId === suggestRequestRef.current) setIsSuggesting(false);
        });
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [geocoder, inputValue, selectedPointKey, value.name]);

  function resetSelectedPoint(name: string) {
    abortRef.current?.abort();
    requestRef.current += 1;
    setGeocodingError("");
    onChange({ name, lat: "", lng: "" });
  }

  function selectSuggestion(suggestion: AddressSuggestion) {
    const normalizedPoint = {
      lat: Number(formatCoordinate(suggestion.point.lat)),
      lng: Number(formatCoordinate(suggestion.point.lng)),
    };

    suggestAbortRef.current?.abort();
    abortRef.current?.abort();
    requestRef.current += 1;
    setInputValue(suggestion.name);
    setSuggestions([]);
    setActiveSuggestionIndex(-1);
    setSuggestError("");
    setGeocodingError("");
    setIsGeocoding(false);
    onChange({
      name: suggestion.name,
      lat: formatCoordinate(normalizedPoint.lat),
      lng: formatCoordinate(normalizedPoint.lng),
    });
  }

  function handleInputChange(nextValue: string) {
    setInputValue(nextValue);
    setSuggestError("");
    resetSelectedPoint(nextValue);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestionIndex((current) => (current + 1) % suggestions.length);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestionIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
    }

    if (event.key === "Enter" && activeSuggestionIndex >= 0) {
      event.preventDefault();
      const suggestion = suggestions[activeSuggestionIndex];
      if (suggestion) selectSuggestion(suggestion);
    }

    if (event.key === "Escape") {
      setSuggestions([]);
      setActiveSuggestionIndex(-1);
    }
  }

  function closeSuggestions() {
    window.setTimeout(() => {
      setSuggestions([]);
      setActiveSuggestionIndex(-1);
    }, 120);
  }

  function toggleMap() {
    if (!apiKey) {
      setMapError(
        "Карта не настроена. Добавьте NEXT_PUBLIC_MAPTILER_API_KEY в apps/web/.env.local."
      );
      return;
    }

    setMapError("");

    if (!hasOpenedMap) {
      setHasOpenedMap(true);
      setIsMapVisible(true);
      return;
    }

    setIsMapVisible((current) => !current);
  }

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
    setSuggestError("");
    setSuggestions([]);
    setActiveSuggestionIndex(-1);
    setIsGeocoding(true);
    setInputValue(fallbackName);
    onChange({
      name: fallbackName,
      lat: formatCoordinate(normalizedPoint.lat),
      lng: formatCoordinate(normalizedPoint.lng),
    });

    try {
      const result = await geocoder?.reverse(normalizedPoint, controller.signal);
      if (requestId !== requestRef.current) return;
      if (!result) throw new Error("Адрес не найден");

      setInputValue(result.name);
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

  return (
    <div className="start-location-picker">
      <div className="start-location-picker__field">
        <label className="start-location-picker__label" htmlFor={inputId}>
          Место старта <span aria-hidden="true">*</span>
        </label>
        <div className="start-location-picker__input-row">
          <div className="start-location-picker__input-wrap">
            <input
              id={inputId}
              className="ui-input start-location-picker__input"
              placeholder="Начните вводить адрес"
              value={inputValue}
              role="combobox"
              aria-autocomplete="list"
              aria-controls={listboxId}
              aria-expanded={showSuggestions}
              aria-activedescendant={
                activeSuggestionIndex >= 0 ? `${listboxId}-${activeSuggestionIndex}` : undefined
              }
              onChange={(event) => handleInputChange(event.target.value)}
              onKeyDown={handleInputKeyDown}
              onBlur={closeSuggestions}
            />
            {showSuggestions ? (
              <div className="start-location-picker__suggestions" id={listboxId} role="listbox">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.id}
                    id={`${listboxId}-${index}`}
                    type="button"
                    role="option"
                    aria-selected={index === activeSuggestionIndex}
                    className={
                      index === activeSuggestionIndex
                        ? "start-location-picker__suggestion is-active"
                        : "start-location-picker__suggestion"
                    }
                    onMouseDown={(event) => {
                      event.preventDefault();
                      selectSuggestion(suggestion);
                    }}
                  >
                    <span>{suggestion.name}</span>
                    <small>{formatPoint(suggestion.point)}</small>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="start-location-picker__map-toggle"
            aria-expanded={isMapVisible}
            onClick={toggleMap}
          >
            {isMapVisible ? "Скрыть карту" : "Показать карту"}
          </button>
        </div>
        <small className="start-location-picker__hint" aria-live="polite">
          {hintText}
        </small>
      </div>

      {hasOpenedMap && apiKey ? (
        <div className="start-location-map" hidden={!isMapVisible}>
          <InteractiveMapLoader
            apiKey={apiKey}
            center={DEFAULT_MAP_CENTER}
            point={selectedPoint}
            onError={() => setMapError("Не удалось загрузить данные карты. Попробуйте ещё раз.")}
            onSelect={(point) => void selectPoint(point)}
          />
        </div>
      ) : null}

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
      {suggestError ? (
        <p className="start-location-picker__warning" role="alert">
          {suggestError}
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
