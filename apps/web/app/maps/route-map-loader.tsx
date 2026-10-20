"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

import type RouteMap from "./route-map";
import styles from "./interactive-map.module.css";

const DynamicRouteMap = dynamic(() => import("./route-map"), {
  ssr: false,
  loading: () => (
    <div className={styles.state} role="status">
      Загружаем карту…
    </div>
  ),
});

export function RouteMapLoader(props: ComponentProps<typeof RouteMap>) {
  return <DynamicRouteMap {...props} />;
}
