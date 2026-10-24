"use client";

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useMemo, useState } from "react";

import { storyTrips } from "./ui/story-fixtures";
import { getTripCardProps } from "./lib/components";
import { TripCard } from "./ui/components";
import { RouteFilterBar } from "./ui/route-filter-bar";
import type { RouteFilterValue } from "./ui/route-filter-bar";
import { initialRouteFilters, matchesRouteFilters } from "./lib/trip-filters";
import styles from "./find-trip-section.module.css";

const meta = {
  title: "Design System/Patterns/Найти поездку",
  parameters: {
    layout: "padded",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;


export const SearchAndResults: Story = {
  name: "Фильтры и карточки",
  render: () => <FindTripPattern />,
};

function FindTripPattern() {
  const [filters, setFilters] = useState<RouteFilterValue>(initialRouteFilters);

  const filteredTrips = useMemo(
    () =>
      storyTrips.filter((trip) => matchesRouteFilters(trip, filters)),
    [filters],
  );

  return (
    <main className={styles.pattern}>
      <header className={styles.header}>
        <div>
          <h1>Найдите подходящую поездку</h1>
          <p>Настройте маршрут, сложность и покрытие — карточки обновятся сразу.</p>
        </div>
        <strong>{filteredTrips.length} из {storyTrips.length}</strong>
      </header>

      <RouteFilterBar value={filters} onChange={setFilters} />

      {filteredTrips.length > 0 ? (
        <section className={styles.results} aria-label="Найденные поездки">
          {filteredTrips.map((trip) => (
            <TripCard {...getTripCardProps(trip)} key={trip.id} />
          ))}
        </section>
      ) : (
        <section className={styles.empty}>
          <h2>Подходящих поездок нет</h2>
          <p>Попробуйте расширить диапазон или выбрать другие параметры.</p>
        </section>
      )}
    </main>
  );
}
