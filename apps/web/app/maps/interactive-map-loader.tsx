"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

import type InteractiveMap from "./interactive-map";
import styles from "./interactive-map.module.css";

const DynamicInteractiveMap = dynamic(() => import("./interactive-map"), {
  ssr: false,
  loading: () => (
    <div className={styles.state} role="status">
      Загружаем карту…
    </div>
  ),
});

export function InteractiveMapLoader(props: ComponentProps<typeof InteractiveMap>) {
  return <DynamicInteractiveMap {...props} />;
}
