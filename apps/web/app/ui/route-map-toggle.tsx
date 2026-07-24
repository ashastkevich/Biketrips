"use client";

import { useState } from "react";

import { getMapTilerApiKey } from "../maps/map-config";
import { GpxRouteMapLoader } from "../maps/gpx-route-map-loader";
import { Button } from "./components";
import styles from "./trip-details.module.css";

interface RouteMapToggleProps {
  fileName: string | null;
  downloadUrl: string;
}

function getApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  return `${apiUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export function RouteMapToggle({ fileName, downloadUrl }: RouteMapToggleProps) {
  const [open, setOpen] = useState(false);
  const [gpxContent, setGpxContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const apiKey = getMapTilerApiKey();
  const absoluteDownloadUrl = getApiUrl(downloadUrl);

  async function toggleMap() {
    const nextOpen = !open;
    setOpen(nextOpen);
    setError("");

    if (!nextOpen || gpxContent) return;

    setLoading(true);
    try {
      const response = await fetch(absoluteDownloadUrl);
      if (!response.ok) throw new Error("Не удалось загрузить GPX-файл");
      setGpxContent(await response.text());
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Не удалось загрузить GPX-файл");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.routeMap}>
      <div className={styles.routeMapActions}>
        <Button tone="secondary" type="button" onClick={() => void toggleMap()}>
          {open ? "Скрыть карту маршрута" : "Открыть карту маршрута"}
        </Button>
        <a className={styles.routeMapDownload} href={absoluteDownloadUrl}>
          Скачать GPX
        </a>
      </div>
      {open ? (
        loading ? (
          <p className={styles.routeMapNotice}>Загружаем GPX-файл…</p>
        ) : error ? (
          <p className={styles.routeMapNotice} role="alert">{error}</p>
        ) : apiKey && gpxContent ? (
          <div className={styles.routeMapCanvas}>
            <GpxRouteMapLoader apiKey={apiKey} fileName={fileName} gpxContent={gpxContent} />
          </div>
        ) : (
          <p className={styles.routeMapNotice}>
            Карта маршрута недоступна: не задан ключ MapTiler.
          </p>
        )
      ) : null}
    </div>
  );
}
