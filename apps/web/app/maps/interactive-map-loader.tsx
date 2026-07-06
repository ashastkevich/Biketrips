"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

import type InteractiveMap from "./interactive-map";

const DynamicInteractiveMap = dynamic(() => import("./interactive-map"), {
  ssr: false,
  loading: () => (
    <div className="start-location-map__state" role="status">
      Загружаем карту…
    </div>
  ),
});

export function InteractiveMapLoader(props: ComponentProps<typeof InteractiveMap>) {
  return <DynamicInteractiveMap {...props} />;
}
