"use client";

import type { City } from "@biketrips/domain";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { CITY_COOKIE_NAME } from "./lib/cities";

export function CityFilter({
  cities,
  selectedCity,
  disabled = false,
  onChange,
}: {
  cities: City[];
  selectedCity: City;
  disabled?: boolean;
  onChange: (city: City) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="city-filter-control" ref={rootRef}>
      <button
        className={`route-filter-trigger${open ? " is-active" : ""}`}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <strong>{selectedCity.name}</strong>
      </button>

      {open ? (
        <section className="route-filter-popover city-filter-popover" aria-label="Выбор города">
          <div className="route-filter-options" role="listbox" aria-label="Город поездки">
            {cities.map((city) => (
              <button
                className={`route-filter-option city-filter-option${city.id === selectedCity.id ? " is-selected" : ""}`}
                type="button"
                role="option"
                aria-selected={city.id === selectedCity.id}
                key={city.id}
                onClick={() => {
                  onChange(city);
                  setOpen(false);
                }}
              >
                <span>
                  <strong>{city.name}</strong>
                </span>
                <span className="route-filter-option__check" aria-hidden="true">✓</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function CitySelector({
  cities,
  selectedCity,
}: {
  cities: City[];
  selectedCity: City;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function selectCity(city: City) {
    document.cookie = `${CITY_COOKIE_NAME}=${encodeURIComponent(city.slug)}; Path=/; Max-Age=31536000; SameSite=Lax`;
    startTransition(() => {
      router.replace(`/?city=${encodeURIComponent(city.slug)}#rides`, { scroll: false });
    });
  }

  return (
    <CityFilter
      cities={cities}
      selectedCity={selectedCity}
      disabled={isPending}
      onChange={selectCity}
    />
  );
}
