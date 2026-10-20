"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { parseGpxRoute } from "../maps/gpx";
import { getMapTilerApiKey } from "../maps/map-config";
import { formatPoint, isValidMapPoint, type MapPoint } from "../maps/map-types";
import { RouteMapLoader } from "../maps/route-map-loader";
import {
  formatDistance,
  getRouteStartDistance,
  isFarRouteStart,
  isLoopRoute,
  isSamePlace,
} from "../maps/route-start";
import { Button } from "./components";
import styles from "./trip-details.module.css";

interface TripStartRouteProps {
  startLocationName: string;
  startTime: string;
  startLat: number | null;
  startLng: number | null;
  gpxFileName: string | null;
  gpxDownloadUrl: string | null;
}

type GpxState = "idle" | "loading" | "loaded" | "error";
type CopyState = "idle" | "copied" | "error";

/**
 * API route-file paths go through the web proxy, which adds the session token: without it the
 * organizer of an unpublished or finished trip would get 404 for their own GPX.
 */
function getGpxUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return normalizedPath.startsWith("/trips/") ? `/api${normalizedPath}` : normalizedPath;
}

function readStartPoint(lat: number | null, lng: number | null): MapPoint | null {
  if (lat === null || lng === null) return null;
  const point = { lat, lng };
  return isValidMapPoint(point) ? point : null;
}

/** Waits until the block is near the viewport, so the map and GPX load only when someone scrolls to them. */
function useNearViewport<T extends Element>() {
  const ref = useRef<T>(null);
  const [isNear, setIsNear] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || isNear) return;
    if (typeof IntersectionObserver === "undefined") {
      setIsNear(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setIsNear(true);
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [isNear]);

  return [ref, isNear] as const;
}

export function TripStartRoute({
  startLocationName,
  startTime,
  startLat,
  startLng,
  gpxFileName,
  gpxDownloadUrl,
}: TripStartRouteProps) {
  const apiKey = getMapTilerApiKey();
  const start = readStartPoint(startLat, startLng);
  const absoluteDownloadUrl = gpxDownloadUrl ? getGpxUrl(gpxDownloadUrl) : null;
  const [mapRef, isNearViewport] = useNearViewport<HTMLDivElement>();
  const [gpxState, setGpxState] = useState<GpxState>("idle");
  const [gpxContent, setGpxContent] = useState("");
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const route = useMemo(() => (gpxContent ? parseGpxRoute(gpxContent) : null), [gpxContent]);
  const hasMap = Boolean(apiKey && (start || absoluteDownloadUrl));

  useEffect(() => {
    if (!isNearViewport || !absoluteDownloadUrl || !apiKey || gpxState !== "idle") return;

    setGpxState("loading");
    fetch(absoluteDownloadUrl)
      .then((response) => {
        if (!response.ok) throw new Error("GPX request failed");
        return response.text();
      })
      .then((content) => {
        setGpxContent(content);
        setGpxState("loaded");
      })
      .catch(() => setGpxState("error"));
  }, [absoluteDownloadUrl, apiKey, gpxState, isNearViewport]);

  useEffect(() => {
    if (copyState === "idle") return;
    const timeout = window.setTimeout(() => setCopyState("idle"), 2500);
    return () => window.clearTimeout(timeout);
  }, [copyState]);

  async function copyCoordinates() {
    if (!start) return;
    try {
      await navigator.clipboard.writeText(formatPoint(start));
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  const gpxUnreadable = gpxState === "loaded" && !route;
  const routeStartDistance = getRouteStartDistance(start, route);
  const isFarStart = isFarRouteStart(routeStartDistance);
  // Without a GPX the map shows the meeting point right away; with one it waits for the track
  // so the map is created once with everything on it.
  const mapReady = isNearViewport && (!absoluteDownloadUrl || gpxState === "loaded" || gpxState === "error");
  const mapHasContent = Boolean(start || route);

  return (
    <section className={styles.section} id="trip-start" aria-labelledby="trip-start-title">
      <h3 id="trip-start-title">{absoluteDownloadUrl ? "Старт и маршрут" : "Место старта"}</h3>
      <div className={styles.startPlaceRow}>
        <p className={styles.startPlace}>
          <span className={styles.startPlaceIcon} aria-hidden="true">⌖</span>
          <span>
            <strong>{startLocationName}</strong>
            <small>Старт в {startTime}</small>
          </span>
        </p>
        {start ? (
          <Button
            className={styles.copyCoordinates}
            size="small"
            tone="secondary"
            type="button"
            onClick={() => void copyCoordinates()}
          >
            {copyState === "copied" ? "Координаты скопированы" : "Скопировать координаты"}
          </Button>
        ) : null}
      </div>
      {copyState === "error" && start ? (
        <p className={styles.routeMapHint} role="status">
          Не удалось скопировать. Координаты: {formatPoint(start)}
        </p>
      ) : null}
      {routeStartDistance !== null && !isFarStart ? (
        <p className={styles.routeStartNote}>
          {isSamePlace(routeStartDistance)
            ? "Маршрут начинается от места сбора."
            : `Начало маршрута — в ${formatDistance(routeStartDistance)} от места сбора.`}
        </p>
      ) : null}
      {routeStartDistance !== null && isFarStart ? (
        <p className={styles.routeStartWarning} role="note">
          <strong>Место сбора в {formatDistance(routeStartDistance)} от начала маршрута.</strong>{" "}
          Читайте внимательно описание поездки.
        </p>
      ) : null}

      {hasMap ? (
        <div ref={mapRef} className={styles.routeMapCanvas}>
          {mapReady && mapHasContent ? (
            <RouteMapLoader
              apiKey={apiKey}
              start={start}
              route={route}
              label={
                route
                  ? `Карта маршрута${gpxFileName ? ` из файла ${gpxFileName}` : ""} с местом старта`
                  : `Место старта: ${startLocationName}`
              }
            />
          ) : (
            <div className={styles.routeMapPlaceholder} role="status">
              {mapReady ? "Не удалось показать маршрут на карте." : "Загружаем карту…"}
            </div>
          )}
        </div>
      ) : null}
      {hasMap && route && start ? (
        <ul className={styles.routeMapLegend} aria-label="Обозначения на карте">
          <li><span className={styles.legendMeeting} aria-hidden="true" />
            {isFarStart ? "Место сбора — за пределами карты" : "Место сбора"}
          </li>
          {routeStartDistance === null || !isSamePlace(routeStartDistance) ? (
            <li><span className={styles.legendRouteStart} aria-hidden="true" />Начало маршрута</li>
          ) : null}
          {!isLoopRoute(route) ? (
            <li><span className={styles.legendFinish} aria-hidden="true" />Финиш</li>
          ) : null}
        </ul>
      ) : null}

      {gpxState === "error" ? (
        <p className={styles.routeMapNotice} role="alert">
          Не удалось загрузить GPX-файл маршрута.
        </p>
      ) : gpxUnreadable ? (
        <p className={styles.routeMapNotice} role="alert">
          Не удалось прочитать координаты из GPX.
        </p>
      ) : null}
      {absoluteDownloadUrl && !apiKey ? (
        <p className={styles.routeMapNotice}>Карта недоступна: не задан ключ MapTiler.</p>
      ) : null}

      {absoluteDownloadUrl ? (
        <div className={styles.routeMapActions}>
          <a
            className={styles.routeMapDownload}
            href={absoluteDownloadUrl}
            title={gpxFileName ?? undefined}
          >
            Скачать GPX
          </a>
        </div>
      ) : null}
    </section>
  );
}
