import type { TripEntity } from "../../infrastructure/database/entities/trip.entity.js";

/** Trip fields whose change matters to participants enough to notify them. */
export interface TripKeySnapshot {
  startAt: string;
  startLocationName: string;
  startLat: number | null;
  startLng: number | null;
  distanceKm: number;
  routeFileKey: string | null;
  routeFileName: string | null;
}

export type TripKeyChange =
  | { field: "startAt"; before: string; after: string }
  | { field: "startLocation"; before: string; after: string }
  | { field: "startPoint" }
  | { field: "distance"; before: number; after: number }
  | { field: "route"; before: string | null; after: string | null };

const startPointThresholdMeters = 300;
const distanceThresholdRatio = 0.1;

export function snapshotTripKeyFields(trip: TripEntity): TripKeySnapshot {
  const routeFile = trip.routeFiles?.[0] ?? null;
  return {
    startAt: new Date(trip.startAt).toISOString(),
    startLocationName: trip.startLocationName,
    startLat: trip.startLat === null || trip.startLat === undefined ? null : Number(trip.startLat),
    startLng: trip.startLng === null || trip.startLng === undefined ? null : Number(trip.startLng),
    distanceKm: Number(trip.distanceKm),
    routeFileKey: routeFile?.storageKey ?? null,
    routeFileName: routeFile?.originalName ?? null,
  };
}

export function diffTripKeyFields(before: TripKeySnapshot, after: TripKeySnapshot): TripKeyChange[] {
  const changes: TripKeyChange[] = [];

  if (before.startAt !== after.startAt) {
    changes.push({ field: "startAt", before: before.startAt, after: after.startAt });
  }
  if (before.startLocationName.trim() !== after.startLocationName.trim()) {
    changes.push({
      field: "startLocation",
      before: before.startLocationName,
      after: after.startLocationName,
    });
  } else if (startPointMoved(before, after)) {
    changes.push({ field: "startPoint" });
  }
  if (
    before.distanceKm > 0 &&
    Math.abs(after.distanceKm - before.distanceKm) / before.distanceKm > distanceThresholdRatio
  ) {
    changes.push({ field: "distance", before: before.distanceKm, after: after.distanceKm });
  }
  if (before.routeFileKey !== after.routeFileKey) {
    changes.push({ field: "route", before: before.routeFileName, after: after.routeFileName });
  }

  return changes;
}

function startPointMoved(before: TripKeySnapshot, after: TripKeySnapshot): boolean {
  if (before.startLat === null || before.startLng === null) {
    return false;
  }
  if (after.startLat === null || after.startLng === null) {
    return false;
  }
  return distanceMeters(before.startLat, before.startLng, after.startLat, after.startLng) >
    startPointThresholdMeters;
}

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);
  const a = Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
