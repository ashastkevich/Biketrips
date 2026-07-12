"use client";

import type { City } from "@biketrips/domain";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { CITY_COOKIE_NAME } from "./lib/cities";
import filterStyles from "./ui/route-filters.module.css";

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

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
    <div className={filterStyles.cityFilterControl} ref={rootRef}>
      <button
        className={classes(filterStyles.trigger, open && filterStyles.triggerActive)}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <strong>{selectedCity.name}</strong>
      </button>

      {open ? (
        <section
          className={`${filterStyles.popover} ${filterStyles.cityPopover}`}
          aria-label="Выбор города"
        >
          <div className={filterStyles.options} role="listbox" aria-label="Город поездки">
            {cities.map((city) => (
              <button
                className={classes(
                  filterStyles.option,
                  filterStyles.cityOption,
                  city.id === selectedCity.id && filterStyles.optionSelected,
                )}
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
                <span className={filterStyles.optionCheck} aria-hidden="true">✓</span>
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
