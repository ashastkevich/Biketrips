"use client";

import { useMemo, useState } from "react";
import type { TripDetail } from "@biketrips/domain";

import { getTripCardProps } from "./lib/components";
import { RouteFilterBar, TripCard } from "./ui/components";
import { TripDetailsModal } from "./ui/trip-details-modal";
import { useTripModal } from "./ui/use-trip-modal";
import type { RouteFilterValue } from "./ui/components";
import type { City } from "@biketrips/domain";
import { CitySelector } from "./city-selector";
import { LinkButton } from "./ui/components";

const initialFilters: RouteFilterValue = {
  measure: "distance",
  distanceFromKm: 0,
  distanceToKm: 200,
  durationFromHours: 0,
  durationToHours: 12,
  difficulty: ["beginner", "easy", "medium", "hard", "sport"],
  surface: "any",
};

export function FindTripSection({
  trips,
  isAuthenticated = false,
  currentUserId,
  cities,
  selectedCity,
}: {
  trips: TripDetail[];
  isAuthenticated?: boolean;
  currentUserId?: string;
  cities: City[];
  selectedCity: City;
}) {
  const [filters, setFilters] = useState<RouteFilterValue>(initialFilters);
  const { selectedTrip, openTrip, closeTrip } = useTripModal(trips, "/");

  const filteredTrips = useMemo(
    () =>
      trips.filter((trip) => {
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
            trip.unpavedPercent < 30) ||
          (filters.surface === "mixed" &&
            trip.unpavedPercent >= 30 &&
            trip.unpavedPercent <= 70) ||
          (filters.surface === "mostly_unpaved" && trip.unpavedPercent > 70);

        return matchesMeasure && matchesDifficulty && matchesSurface;
      }),
    [filters, trips],
  );

  return (
    <section className="find-trip-pattern" aria-labelledby="rides-title">
      <header className="find-trip-pattern__header">
        <div>
          <h1 id="rides-title">Найдите подходящую поездку</h1>
          <p>Настройте маршрут, сложность и покрытие — карточки обновятся сразу.</p>
        </div>
        <strong>{filteredTrips.length} из {trips.length}</strong>
      </header>

      <div className="find-trip-filters">
        <CitySelector cities={cities} selectedCity={selectedCity} />
        <RouteFilterBar value={filters} onChange={setFilters} />
      </div>

      {filteredTrips.length > 0 ? (
        <section className="results" aria-label="Найденные поездки">
          {filteredTrips.map((trip) => (
            <TripCard
              {...getTripCardProps(trip)}
              key={trip.id}
              onOpen={() => openTrip(trip)}
            />
          ))}
        </section>
      ) : trips.length === 0 ? (
        <section className="find-trip-pattern__empty">
          <h2>Пока нет ближайших поездок</h2>
          <p>{selectedCity.name}: создайте первую поездку или выберите другой город.</p>
          <LinkButton href={`/trips/new?city=${encodeURIComponent(selectedCity.slug)}`}>
            Создать поездку
          </LinkButton>
        </section>
      ) : (
        <section className="find-trip-pattern__empty">
          <h2>Подходящих поездок нет</h2>
          <p>Попробуйте расширить диапазон или сбросить выбранные параметры.</p>
          <button
            className="ui-button ui-button--secondary"
            type="button"
            onClick={() => setFilters(initialFilters)}
          >
            Сбросить фильтры
          </button>
        </section>
      )}

      {selectedTrip ? (
        <TripDetailsModal
          open
          trip={selectedTrip}
          coverImage={getTripCardProps(selectedTrip).coverImage}
          isAuthenticated={isAuthenticated}
          currentUserId={currentUserId}
          onClose={closeTrip}
        />
      ) : null}
    </section>
  );
}
