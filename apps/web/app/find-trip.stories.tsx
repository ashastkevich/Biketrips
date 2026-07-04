"use client";

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useMemo, useState } from "react";

import { demoTrips } from "./lib/demo-data";
import { getTripCardProps } from "./lib/components";
import { RouteFilterBar, TripCard } from "./ui/components";
import type { RouteFilterValue } from "./ui/components";

const meta = {
  title: "Design System/Patterns/Найти поездку",
  parameters: {
    layout: "padded",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const initialFilters: RouteFilterValue = {
  measure: "distance",
  distanceFromKm: 0,
  distanceToKm: 200,
  durationFromHours: 0,
  durationToHours: 12,
  difficulty: ["beginner", "easy", "medium", "hard", "sport"],
  surface: "any",
};

export const SearchAndResults: Story = {
  name: "Фильтры и карточки",
  render: () => <FindTripPattern />,
};

function FindTripPattern() {
  const [filters, setFilters] = useState<RouteFilterValue>(initialFilters);

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
    <main className="find-trip-pattern">
      <header className="find-trip-pattern__header">
        <div>
          <p className="eyebrow">Поездки рядом</p>
          <h1>Найдите подходящую поездку</h1>
          <p>Настройте маршрут, сложность и покрытие — карточки обновятся сразу.</p>
        </div>
        <strong>{filteredTrips.length} из {demoTrips.length}</strong>
      </header>

      <RouteFilterBar value={filters} onChange={setFilters} />

      {filteredTrips.length > 0 ? (
        <section className="results" aria-label="Найденные поездки">
          {filteredTrips.map((trip) => (
            <TripCard {...getTripCardProps(trip)} key={trip.id} />
          ))}
        </section>
      ) : (
        <section className="find-trip-pattern__empty">
          <h2>Подходящих поездок нет</h2>
          <p>Попробуйте расширить диапазон или выбрать другие параметры.</p>
        </section>
      )}
    </main>
  );
}
