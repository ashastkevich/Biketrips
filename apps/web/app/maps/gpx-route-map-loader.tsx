"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

import type GpxRouteMap from "./gpx-route-map";
import styles from "./interactive-map.module.css";

const DynamicGpxRouteMap = dynamic(() => import("./gpx-route-map"), {
  ssr: false,
  loading: () => (
    <div className={styles.state} role="status">
      Загружаем маршрут…
    </div>
  ),
});

export function GpxRouteMapLoader(props: ComponentProps<typeof GpxRouteMap>) {
  return <DynamicGpxRouteMap {...props} />;
}
