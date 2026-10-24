"use client";

import { useMemo, useState } from "react";
import type { TripDetail } from "@biketrips/domain";

import { getTripCardProps } from "./lib/components";
import { Button, TripCard } from "./ui/components";
import { RouteFilterBar } from "./ui/route-filter-bar";
import { TripDetailsModal } from "./ui/trip-details-modal";
import { useTripModal } from "./ui/use-trip-modal";
import type { RouteFilterValue } from "./ui/route-filter-bar";
import { initialRouteFilters, matchesRouteFilters } from "./lib/trip-filters";
import type { City } from "@biketrips/domain";
import { CitySelector } from "./city-selector";
import { LinkButton } from "./ui/components";
import styles from "./find-trip-section.module.css";
import filterStyles from "./ui/route-filters.module.css";


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
  const [filters, setFilters] = useState<RouteFilterValue>(initialRouteFilters);
  const {
    selectedTrip,
    savedChanges,
    openTrip,
    closeTrip,
    acknowledgeSavedChanges,
  } = useTripModal(trips, "/", "feed");

  const filteredTrips = useMemo(
    () =>
      trips.filter((trip) => matchesRouteFilters(trip, filters)),
    [filters, trips],
  );

  return (
    <section className={styles.pattern} aria-labelledby="rides-title">
      <header className={styles.header}>
        <div>
          <h2 id="rides-title">Найдите подходящую поездку</h2>
          <p>Настройте маршрут, сложность и покрытие — карточки обновятся сразу.</p>
        </div>
        <strong>{filteredTrips.length} из {trips.length}</strong>
      </header>

      <div className={filterStyles.findTripFilters}>
        <CitySelector cities={cities} selectedCity={selectedCity} />
        <RouteFilterBar value={filters} onChange={setFilters} />
      </div>

      {filteredTrips.length > 0 ? (
        <section className={styles.results} aria-label="Найденные поездки">
          {filteredTrips.map((trip) => (
            <TripCard
              {...getTripCardProps(trip)}
              key={trip.id}
              onOpen={() => openTrip(trip)}
            />
          ))}
        </section>
      ) : trips.length === 0 ? (
        <section className={styles.empty}>
          <h2>Пока нет ближайших поездок</h2>
          <p>{selectedCity.name}: создайте первую поездку или выберите другой город.</p>
          <LinkButton
            className={styles.emptyAction}
            href={`/trips/new?city=${encodeURIComponent(selectedCity.slug)}`}
          >
            Создать поездку
          </LinkButton>
        </section>
      ) : (
        <section className={styles.empty}>
          <h2>Подходящих поездок нет</h2>
          <p>Попробуйте расширить диапазон или сбросить выбранные параметры.</p>
          <Button
            className={styles.emptyAction}
            tone="secondary"
            type="button"
            onClick={() => setFilters(initialRouteFilters)}
          >
            Сбросить фильтры
          </Button>
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
          returnPath="/"
          returnScope="feed"
          savedChanges={savedChanges}
          onSavedConfirmationClose={acknowledgeSavedChanges}
        />
      ) : null}
    </section>
  );
}
