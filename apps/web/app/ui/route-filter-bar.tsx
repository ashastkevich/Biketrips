"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { DifficultyLevel } from "@biketrips/domain";
import { difficultyDescriptions, difficultyLabels } from "../lib/labels";
import filterStyles from "./route-filters.module.css";
import { classes } from "./class-names";
import { Button } from "./components";

export interface RouteFilterValue {
  measure: "distance" | "duration";
  distanceFromKm: number;
  distanceToKm: number;
  durationFromHours: number;
  durationToHours: number;
  difficulty: DifficultyLevel[];
  surface: "any" | "asphalt_only" | "mostly_asphalt" | "mixed" | "mostly_unpaved";
}

export function RouteFilterBar({
  value,
  onChange,
}: {
  value: RouteFilterValue;
  onChange: (value: RouteFilterValue) => void;
}) {
  const [openFilter, setOpenFilter] = useState<"measure" | "difficulty" | "surface" | null>(null);
  const filterTriggersRef = useRef<HTMLDivElement>(null);
  const filterPopoverRef = useRef<HTMLElement>(null);
  const difficultyOptions = [
    {
      value: "beginner" as const,
      label: difficultyLabels.beginner,
      description: difficultyDescriptions.beginner,
    },
    {
      value: "easy" as const,
      label: difficultyLabels.easy,
      description: difficultyDescriptions.easy,
    },
    {
      value: "medium" as const,
      label: difficultyLabels.medium,
      description: difficultyDescriptions.medium,
    },
    {
      value: "hard" as const,
      label: difficultyLabels.hard,
      description: difficultyDescriptions.hard,
    },
    {
      value: "sport" as const,
      label: difficultyLabels.sport,
      description: difficultyDescriptions.sport,
    },
  ];
  const surfaceOptions = [
    { value: "any" as const, label: "Неважно", description: "Любое соотношение покрытия" },
    { value: "asphalt_only" as const, label: "Только асфальт", description: "Без грунтовых участков" },
    { value: "mostly_asphalt" as const, label: "В основном асфальт", description: "Грунта меньше 30%" },
    { value: "mixed" as const, label: "Смешанный маршрут", description: "Грунта от 30% до 70%" },
    { value: "mostly_unpaved" as const, label: "В основном грунт", description: "Грунта больше 70%" },
  ];
  const measureMin = 0;
  const measureMax = value.measure === "distance" ? 200 : 12;
  const measureStep = value.measure === "distance" ? 5 : 1;
  const measureFrom = value.measure === "distance" ? value.distanceFromKm : value.durationFromHours;
  const measureTo = value.measure === "distance" ? value.distanceToKm : value.durationToHours;
  const fromPercentage = ((measureFrom - measureMin) / (measureMax - measureMin)) * 100;
  const toPercentage = ((measureTo - measureMin) / (measureMax - measureMin)) * 100;

  useEffect(() => {
    if (!openFilter) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      const trigger =
        target instanceof Element ? target.closest(`.${filterStyles.trigger}`) : null;
      const clickedTrigger =
        trigger !== null && filterTriggersRef.current?.contains(trigger);
      const clickedPopover = filterPopoverRef.current?.contains(target);

      if (!clickedTrigger && !clickedPopover) {
        setOpenFilter(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenFilter(null);
        window.requestAnimationFrame(() => {
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
        });
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openFilter]);

  function toggleFilter(filter: typeof openFilter) {
    setOpenFilter((current) => (current === filter ? null : filter));
  }

  function toggleDifficulty(option: RouteFilterValue["difficulty"][number]) {
    const difficulty = value.difficulty.includes(option)
      ? value.difficulty.filter((item) => item !== option)
      : [...value.difficulty, option];
    onChange({ ...value, difficulty });
  }

  return (
    <div className={filterStyles.bar}>
      <div
        className={filterStyles.triggers}
        aria-label="Фильтры маршрутов"
        ref={filterTriggersRef}
      >
        <FilterTrigger
          label="Дистанция / время"
          active={openFilter === "measure"}
          filtered={
            value.distanceFromKm !== 0 ||
            value.distanceToKm !== 200 ||
            value.durationFromHours !== 0 ||
            value.durationToHours !== 12
          }
          onClick={() => toggleFilter("measure")}
        />
        <FilterTrigger
          label="Сложность маршрута"
          active={openFilter === "difficulty"}
          filtered={value.difficulty.length !== difficultyOptions.length}
          onClick={() => toggleFilter("difficulty")}
        />
        <FilterTrigger
          label="Покрытие"
          active={openFilter === "surface"}
          filtered={value.surface !== "any"}
          onClick={() => toggleFilter("surface")}
        />
      </div>

      {openFilter ? (
        <section
          className={filterStyles.popover}
          aria-label="Настройка фильтра"
          ref={filterPopoverRef}
        >
          {openFilter === "measure" ? (
            <>
              <div className={filterStyles.popoverHeading}>
                <div>
                  <strong>{value.measure === "distance" ? "Дистанция" : "Время"}</strong>
                </div>
                <strong className={filterStyles.popoverValue}>
                  {value.measure === "distance"
                    ? `${value.distanceFromKm}–${value.distanceToKm} км`
                    : `${value.durationFromHours}–${value.durationToHours} ч`}
                </strong>
              </div>
              <div className={filterStyles.segmented} role="group" aria-label="Единица маршрута">
                <button
                  type="button"
                  aria-pressed={value.measure === "distance"}
                  onClick={() => onChange({ ...value, measure: "distance" })}
                >
                  Дистанция
                </button>
                <button
                  type="button"
                  aria-pressed={value.measure === "duration"}
                  onClick={() => onChange({ ...value, measure: "duration" })}
                >
                  Время
                </button>
              </div>
              <div
                className={filterStyles.dualRange}
                style={{
                  "--range-from": `${fromPercentage}%`,
                  "--range-to": `${toPercentage}%`,
                } as CSSProperties}
              >
                <span className={filterStyles.dualRangeTrack} aria-hidden="true" />
                <input
                  type="range"
                  min={measureMin}
                  max={measureMax}
                  step={measureStep}
                  value={measureFrom}
                  aria-label={value.measure === "distance" ? "Дистанция от" : "Время от"}
                  onChange={(event) => {
                    const next = Math.min(Number(event.target.value), measureTo);
                    onChange({
                      ...value,
                      [value.measure === "distance" ? "distanceFromKm" : "durationFromHours"]: next,
                    });
                  }}
                />
                <input
                  type="range"
                  min={measureMin}
                  max={measureMax}
                  step={measureStep}
                  value={measureTo}
                  aria-label={value.measure === "distance" ? "Дистанция до" : "Время до"}
                  onChange={(event) => {
                    const next = Math.max(Number(event.target.value), measureFrom);
                    onChange({
                      ...value,
                      [value.measure === "distance" ? "distanceToKm" : "durationToHours"]: next,
                    });
                  }}
                />
              </div>
              <div className={filterStyles.manual}>
                <span className={filterStyles.manualControl}>
                  <input
                    type="number"
                    min={measureMin}
                    max={value.measure === "distance" ? value.distanceToKm : value.durationToHours}
                    step={measureStep}
                    value={value.measure === "distance" ? value.distanceFromKm : value.durationFromHours}
                    aria-label={value.measure === "distance" ? "Дистанция от" : "Время от"}
                    onChange={(event) =>
                      onChange({
                        ...value,
                        [value.measure === "distance" ? "distanceFromKm" : "durationFromHours"]: Number(event.target.value),
                      })
                    }
                  />
                  <span>{value.measure === "distance" ? "км" : "ч"}</span>
                </span>
                <span className={filterStyles.manualDash} aria-hidden="true">—</span>
                <span className={filterStyles.manualControl}>
                  <input
                    type="number"
                    min={value.measure === "distance" ? value.distanceFromKm : value.durationFromHours}
                    max={measureMax}
                    step={measureStep}
                    value={value.measure === "distance" ? value.distanceToKm : value.durationToHours}
                    aria-label={value.measure === "distance" ? "Дистанция до" : "Время до"}
                    onChange={(event) =>
                      onChange({
                        ...value,
                        [value.measure === "distance" ? "distanceToKm" : "durationToHours"]: Number(event.target.value),
                      })
                    }
                  />
                  <span>{value.measure === "distance" ? "км" : "ч"}</span>
                </span>
              </div>
            </>
          ) : null}

          {openFilter === "difficulty" ? (
            <>
              <strong className={filterStyles.popoverTitle}>Сложность маршрута</strong>
              <div className={filterStyles.difficultyOptions}>
                {difficultyOptions.map((option) => (
                  <label className={filterStyles.difficultyOption} key={option.value}>
                    <span
                      className={classes(
                        filterStyles.difficultyLevel,
                        option.value === "beginner" && filterStyles.difficultyLevelBeginner,
                        option.value === "medium" && filterStyles.difficultyLevelMedium,
                        option.value === "hard" && filterStyles.difficultyLevelHard,
                        option.value === "sport" && filterStyles.difficultyLevelSport,
                      )}
                      aria-hidden="true"
                    />
                    <span>
                      <span className={filterStyles.difficultyLabel}>{option.label}</span>
                      <span className={filterStyles.difficultyDescription}>
                        {option.description}
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={value.difficulty.includes(option.value)}
                      aria-label={option.label}
                      onChange={() => toggleDifficulty(option.value)}
                    />
                  </label>
                ))}
              </div>
            </>
          ) : null}

          {openFilter === "surface" ? (
            <div className={`${filterStyles.options} ${filterStyles.surfaceOptions}`}>
              {surfaceOptions.map((option) => (
                <button
                  className={classes(
                    filterStyles.option,
                    value.surface === option.value && filterStyles.optionSelected,
                  )}
                  type="button"
                  aria-pressed={value.surface === option.value}
                  onClick={() => onChange({ ...value, surface: option.value })}
                  key={option.value}
                >
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                  <span className={filterStyles.optionCheck}>✓</span>
                </button>
              ))}
            </div>
          ) : null}

          <div className={filterStyles.popoverFooter}>
            <button
              className={filterStyles.reset}
              type="button"
              disabled={
                openFilter === "measure"
                  ? value.distanceFromKm === 0 &&
                    value.distanceToKm === 200 &&
                    value.durationFromHours === 0 &&
                    value.durationToHours === 12
                  : openFilter === "difficulty"
                  ? value.difficulty.length === difficultyOptions.length
                  : openFilter === "surface"
                    ? value.surface === "any"
                    : false
              }
              onClick={() =>
                onChange({
                  ...value,
                  distanceFromKm: openFilter === "measure" ? 0 : value.distanceFromKm,
                  distanceToKm: openFilter === "measure" ? 200 : value.distanceToKm,
                  durationFromHours: openFilter === "measure" ? 0 : value.durationFromHours,
                  durationToHours: openFilter === "measure" ? 12 : value.durationToHours,
                  difficulty:
                    openFilter === "difficulty"
                      ? difficultyOptions.map((option) => option.value)
                      : value.difficulty,
                  surface:
                    openFilter === "surface"
                      ? "any"
                      : value.surface,
                })
              }
            >
              Сбросить фильтры
            </button>
            <Button size="small" onClick={() => setOpenFilter(null)}>Готово</Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function FilterTrigger({
  label,
  summary,
  active,
  filtered,
  onClick,
}: {
  label: string;
  summary?: string;
  active: boolean;
  filtered: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={classes(
        filterStyles.trigger,
        (active || summary) && filterStyles.triggerActive,
        filtered && filterStyles.triggerFiltered,
      )}
      type="button"
      aria-expanded={active}
      onClick={onClick}
    >
      {label === "Сложность маршрута" ? (
        <svg className={filterStyles.triggerIcon} viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M2.5 14.87V17.5M10 8.95V17.5M6.25 12.24V17.5M13.75 5.66V17.5M17.5 2.5V17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ) : null}
      {label === "Покрытие" ? (
        <svg className={filterStyles.triggerIcon} viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M2.5 5.25C4.4 4.1 6.1 4.1 8 5.25C9.9 6.4 11.6 6.4 13.5 5.25C15.1 4.3 16.3 4.2 17.5 4.7M2.5 10C4.4 8.85 6.1 8.85 8 10C9.9 11.15 11.6 11.15 13.5 10C15.1 9.05 16.3 8.95 17.5 9.45M2.5 14.75C4.4 13.6 6.1 13.6 8 14.75C9.9 15.9 11.6 15.9 13.5 14.75C15.1 13.8 16.3 13.7 17.5 14.2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ) : null}
      {label === "Дистанция / время" ? (
        <svg className={filterStyles.triggerIcon} viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 5.75V10L13 11.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
      <span className={filterStyles.triggerCopy}><strong>{label}</strong>{summary ? <small>{summary}</small> : null}</span>
      {label !== "Сложность маршрута" && label !== "Покрытие" && label !== "Дистанция / время" ? (
        <span className={filterStyles.triggerChevron} aria-hidden="true">⌄</span>
      ) : null}
      {filtered ? <span className={filterStyles.triggerBadge} aria-label="Фильтр применён">1</span> : null}
    </button>
  );
}
