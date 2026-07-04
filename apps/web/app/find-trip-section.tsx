"use client";

import { useMemo, useState } from "react";

import { getTripCardProps } from "./lib/components";
import { demoTrips } from "./lib/demo-data";
import { RouteFilterBar, TripCard } from "./ui/components";
import { TripDetailsModal } from "./ui/trip-details-modal";
import type { RouteFilterValue } from "./ui/components";
import type { TripDetail } from "@biketrips/domain";

const initialFilters: RouteFilterValue = {
  measure: "distance",
  distanceFromKm: 0,
  distanceToKm: 200,
  durationFromHours: 0,
  durationToHours: 12,
  difficulty: ["beginner", "easy", "medium", "hard", "sport"],
  surface: "any",
};

export function FindTripSection() {
  const [filters, setFilters] = useState<RouteFilterValue>(initialFilters);
  const [selectedTrip, setSelectedTrip] = useState<TripDetail | null>(null);

  const filteredTrips = useMemo(
    () =>
      demoTrips.filter((trip) => {
        const averageSpeed = ((trip.paceMin ?? 20) + (trip.paceMax ?? 20)) / 2;
        const durationHours = trip.distanceKm / averageSpeed;
        const matchesMeasure =
          filters.measure === "distance"
            ? trip.distanceKm >= filters.distanceFromKm &&
              trip.distanceKm <= filters.distanceToKm
            : durationHours >= filters.durationFromHours &&
              durationHours <= filters.durationToHours;
        const matchesDifficulty = filters.difficulty.includes(trip.difficulty);
        const matchesSurface =
          filters.surface === "any" ||
          (filters.surface === "asphalt_only" && trip.unpavedPercent === 0) ||
          (filters.surface === "mostly_asphalt" &&
            trip.unpavedPercent > 0 &&
            trip.unpavedPercent <= 30) ||
          (filters.surface === "mixed" &&
            trip.unpavedPercent > 30 &&
            trip.unpavedPercent < 70) ||
          (filters.surface === "mostly_unpaved" && trip.unpavedPercent >= 70);

        return matchesMeasure && matchesDifficulty && matchesSurface;
      }),
    [filters],
  );

  return (
    <section className="find-trip-pattern" aria-labelledby="rides-title">
      <header className="find-trip-pattern__header">
        <div>
          <p className="eyebrow">Поездки рядом</p>
          <h1 id="rides-title">Найдите подходящую поездку</h1>
          <p>Настройте маршрут, сложность и покрытие — карточки обновятся сразу.</p>
        </div>
        <strong>{filteredTrips.length} из {demoTrips.length}</strong>
      </header>

      <RouteFilterBar value={filters} onChange={setFilters} />

      {filteredTrips.length > 0 ? (
        <section className="results" aria-label="Найденные поездки">
          {filteredTrips.map((trip) => (
            <TripCard
              {...getTripCardProps(trip)}
              href={undefined}
              key={trip.id}
              onOpen={() => setSelectedTrip(trip)}
            />
          ))}
        </section>
      ) : (
        <section className="find-trip-pattern__empty">
          <h2>Подходящих поездок нет</h2>
          <p>Попробуйте расширить диапазон или выбрать другие параметры.</p>
        </section>
      )}

      {selectedTrip ? (
        <TripDetailsModal
          open
          trip={selectedTrip}
          coverImage={getTripCardProps(selectedTrip).coverImage}
          hasParticipantLimit={selectedTrip.capacity < 500}
          onClose={() => setSelectedTrip(null)}
        />
      ) : null}
    </section>
  );
}
