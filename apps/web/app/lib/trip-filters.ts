import type { TripDetail } from "@biketrips/domain";

import type { RouteFilterValue } from "../ui/route-filter-bar";

export const initialRouteFilters: RouteFilterValue = {
  measure: "distance",
  distanceFromKm: 0,
  distanceToKm: 200,
  durationFromHours: 0,
  durationToHours: 12,
  difficulty: ["beginner", "easy", "medium", "hard", "sport"],
  surface: "any",
};

type FilterableTrip = Pick<
  TripDetail,
  "distanceKm" | "difficulty" | "unpavedPercent" | "paceMin" | "paceMax"
>;

/**
 * Imported trips may not state distance, difficulty or surface. They stay in the list
 * until the rider narrows that particular filter.
 */
export function matchesRouteFilters(trip: FilterableTrip, filters: RouteFilterValue): boolean {
  const averageSpeed = ((trip.paceMin ?? 20) + (trip.paceMax ?? 20)) / 2;
  const measureIsDefault =
    filters.measure === "distance"
      ? filters.distanceFromKm === initialRouteFilters.distanceFromKm &&
        filters.distanceToKm === initialRouteFilters.distanceToKm
      : filters.durationFromHours === initialRouteFilters.durationFromHours &&
        filters.durationToHours === initialRouteFilters.durationToHours;
  let matchesMeasure = measureIsDefault;
  if (trip.distanceKm !== null) {
    const durationHours = trip.distanceKm / averageSpeed;
    matchesMeasure =
      filters.measure === "distance"
        ? trip.distanceKm >= filters.distanceFromKm && trip.distanceKm <= filters.distanceToKm
        : durationHours >= filters.durationFromHours && durationHours <= filters.durationToHours;
  }

  const matchesDifficulty =
    trip.difficulty === null
      ? filters.difficulty.length === initialRouteFilters.difficulty.length
      : filters.difficulty.includes(trip.difficulty);

  const unpaved = trip.unpavedPercent;
  const matchesSurface =
    filters.surface === "any" ||
    (unpaved !== null &&
      ((filters.surface === "asphalt_only" && unpaved === 0) ||
        (filters.surface === "mostly_asphalt" && unpaved > 0 && unpaved < 30) ||
        (filters.surface === "mixed" && unpaved >= 30 && unpaved <= 70) ||
        (filters.surface === "mostly_unpaved" && unpaved > 70)));

  return matchesMeasure && matchesDifficulty && matchesSurface;
}
