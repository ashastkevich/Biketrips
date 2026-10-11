import * as maplibregl from "maplibre-gl";

// MapLibre 6 derives its worker URL from its own file at runtime, which webpack cannot follow,
// so the worker is emitted as a build asset and its URL is set explicitly.
maplibregl.setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);

export { maplibregl };
