"use client";

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useMemo, useState } from "react";

import { demoTrips } from "./lib/demo-data";
import { TripPreviewCard } from "./trips/new/trip-creation-wizard";
import { RouteFilterBar } from "./ui/components";
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
  difficulty: ["easy", "medium", "hard"],
  surface: ["asphalt", "gravel", "unpaved", "offroad"],
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
          trip.surfaceType === "mixed"
            ? filters.surface.length > 1
            : trip.surfaceType === "dirt" || trip.surfaceType === "park_paths"
              ? filters.surface.includes("unpaved")
              : filters.surface.includes(trip.surfaceType);

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
          {filteredTrips.map((trip, index) => {
            const startDate = new Date(trip.startDateTime);
            const date = startDate.toLocaleDateString("ru-RU", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            });
            const time = startDate.toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
            });
            const averageSpeed = Math.round(
              ((trip.paceMin ?? 20) + (trip.paceMax ?? 20)) / 2,
            );

            return (
              <TripPreviewCard
                key={trip.id}
                title={trip.title}
                date={date}
                time={time}
                startLocationName={trip.startLocationName}
                distanceKm={trip.distanceKm}
                difficulty={trip.difficulty}
                averageSpeed={averageSpeed}
                maxParticipants={trip.capacity}
                coverImage={`/img/Photo${(index % 4) + 1}.jpg`}
              />
            );
          })}
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
