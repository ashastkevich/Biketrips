"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type {
  ButtonHTMLAttributes,
  CSSProperties,
  InputHTMLAttributes,
  RefObject,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import type {
  BikeType,
  DifficultyLevel,
  ParticipantStatus,
  TripFilters as TripFilterValues,
  TripParticipant,
  TripStatus,
  TripSummary,
} from "@biketrips/domain";

import {
  bikeTypeLabels,
  difficultyLabels,
  formatDateTime,
  participantStatusLabels,
  tripStatusLabels,
} from "../lib/labels";

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

type ButtonTone = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "small" | "medium" | "large";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ButtonTone;
  size?: ButtonSize;
  loading?: boolean;
}

export function Button({
  tone = "primary",
  size = "medium",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={classes("ui-button", `ui-button--${tone}`, `ui-button--${size}`, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className="ui-spinner" aria-hidden="true" /> : null}
      <span className="ui-button__label">{children}</span>
    </button>
  );
}

export function LinkButton({
  href,
  tone = "primary",
  size = "medium",
  children,
  className,
}: {
  href: string;
  tone?: ButtonTone;
  size?: ButtonSize;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      className={classes("ui-button", `ui-button--${tone}`, `ui-button--${size}`, className)}
      href={href}
    >
      <span className="ui-button__label">{children}</span>
    </Link>
  );
}

export function IconButton({
  label,
  children,
  tone = "secondary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
  tone?: "secondary" | "dark";
}) {
  return (
    <button
      className={classes("ui-icon-button", `ui-icon-button--${tone}`, className)}
      type="button"
      aria-label={label}
      {...props}
    >
      {children}
    </button>
  );
}

type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

export function Badge({
  children,
  tone = "neutral",
  dot = false,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
}) {
  return (
    <span className={classes("ui-badge", `ui-badge--${tone}`)}>
      {dot ? <span className="ui-badge__dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

export function Chip({
  children,
  selected = false,
  onClick,
}: {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={classes("ui-chip", selected && "is-selected")}
      type="button"
      aria-pressed={selected}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export interface RouteFilterValue {
  measure: "distance" | "duration";
  distanceFromKm: number;
  distanceToKm: number;
  durationFromHours: number;
  durationToHours: number;
  difficulty: Array<"easy" | "medium" | "hard">;
  surface: Array<"asphalt" | "gravel" | "unpaved" | "offroad">;
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
    { value: "easy" as const, label: "Легкий" },
    { value: "medium" as const, label: "Средний" },
    { value: "hard" as const, label: "Сложный" },
  ];
  const surfaceOptions = [
    { value: "asphalt" as const, label: "Асфальт", icon: "━" },
    { value: "gravel" as const, label: "Гравий", icon: "∙∙" },
    { value: "unpaved" as const, label: "Грунт", icon: "≈" },
    { value: "offroad" as const, label: "Бездорожье", icon: "⌁" },
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
        target instanceof Element ? target.closest(".route-filter-trigger") : null;
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

  function toggleSurface(option: RouteFilterValue["surface"][number]) {
    const surface = value.surface.includes(option)
      ? value.surface.filter((item) => item !== option)
      : [...value.surface, option];
    onChange({ ...value, surface });
  }

  return (
    <div className="route-filter-bar">
      <div
        className="route-filter-bar__triggers"
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
          filtered={value.surface.length !== surfaceOptions.length}
          onClick={() => toggleFilter("surface")}
        />
      </div>

      {openFilter ? (
        <section
          className="route-filter-popover"
          aria-label="Настройка фильтра"
          ref={filterPopoverRef}
        >
          {openFilter === "measure" ? (
            <>
              <div className="route-filter-popover__heading">
                <div>
                  <strong>{value.measure === "distance" ? "Дистанция" : "Время"}</strong>
                </div>
                <strong className="route-filter-popover__value">
                  {value.measure === "distance"
                    ? `${value.distanceFromKm}–${value.distanceToKm} км`
                    : `${value.durationFromHours}–${value.durationToHours} ч`}
                </strong>
              </div>
              <div className="route-filter-segmented" role="group" aria-label="Единица маршрута">
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
                className="route-filter-dual-range"
                style={{
                  "--range-from": `${fromPercentage}%`,
                  "--range-to": `${toPercentage}%`,
                } as CSSProperties}
              >
                <span className="route-filter-dual-range__track" aria-hidden="true" />
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
              <div className="route-filter-manual">
                <span className="route-filter-manual__control">
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
                <span className="route-filter-manual__dash" aria-hidden="true">—</span>
                <span className="route-filter-manual__control">
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
              <strong className="route-filter-popover__title">Сложность маршрута</strong>
              <div className="route-difficulty-options">
                {difficultyOptions.map((option) => (
                  <label className="route-difficulty-option" key={option.value}>
                    <span
                      className={`route-difficulty-option__level is-${option.value}`}
                      aria-hidden="true"
                    />
                    <span className="route-difficulty-option__label">{option.label}</span>
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
            <div className="route-filter-options route-filter-options--surface">
              {surfaceOptions.map((option) => (
                <button
                  className={classes("route-filter-option", value.surface.includes(option.value) && "is-selected")}
                  type="button"
                  aria-pressed={value.surface.includes(option.value)}
                  onClick={() => toggleSurface(option.value)}
                  key={option.value}
                >
                  <span className="route-filter-option__surface">{option.icon}</span>
                  <strong>{option.label}</strong>
                  <span className="route-filter-option__check">✓</span>
                </button>
              ))}
            </div>
          ) : null}

          <div className="route-filter-popover__footer">
            <button
              className="route-filter-reset"
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
                    ? value.surface.length === surfaceOptions.length
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
                      ? surfaceOptions.map((option) => option.value)
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
        "route-filter-trigger",
        (active || summary) && "is-active",
        filtered && "is-filtered",
      )}
      type="button"
      aria-expanded={active}
      onClick={onClick}
    >
      {label === "Сложность маршрута" ? (
        <svg className="route-filter-trigger__icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M2.5 14.87V17.5M10 8.95V17.5M6.25 12.24V17.5M13.75 5.66V17.5M17.5 2.5V17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ) : null}
      {label === "Покрытие" ? (
        <svg className="route-filter-trigger__icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M2.5 5.25C4.4 4.1 6.1 4.1 8 5.25C9.9 6.4 11.6 6.4 13.5 5.25C15.1 4.3 16.3 4.2 17.5 4.7M2.5 10C4.4 8.85 6.1 8.85 8 10C9.9 11.15 11.6 11.15 13.5 10C15.1 9.05 16.3 8.95 17.5 9.45M2.5 14.75C4.4 13.6 6.1 13.6 8 14.75C9.9 15.9 11.6 15.9 13.5 14.75C15.1 13.8 16.3 13.7 17.5 14.2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ) : null}
      {label === "Дистанция / время" ? (
        <svg className="route-filter-trigger__icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 5.75V10L13 11.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
      <span><strong>{label}</strong>{summary ? <small>{summary}</small> : null}</span>
      {label !== "Сложность маршрута" && label !== "Покрытие" && label !== "Дистанция / время" ? (
        <span className="route-filter-trigger__chevron" aria-hidden="true">⌄</span>
      ) : null}
      {filtered ? <span className="route-filter-trigger__badge" aria-label="Фильтр применён">1</span> : null}
    </button>
  );
}

export function Card({
  children,
  className,
  padding = "medium",
}: {
  children: ReactNode;
  className?: string;
  padding?: "none" | "small" | "medium" | "large";
}) {
  return <div className={classes("ui-card", `ui-card--${padding}`, className)}>{children}</div>;
}

export function FormField({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={classes("ui-field", error && "has-error", className)}>
      <span className="ui-field__label">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      {children}
      {error ? <span className="ui-field__error">{error}</span> : null}
      {!error && hint ? <span className="ui-field__hint">{hint}</span> : null}
    </label>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link className="ui-back-link" href={href}>
      <span aria-hidden="true">←</span>
      {children}
    </Link>
  );
}

export function TextField({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={classes("ui-input", className)} {...props} />;
}

export function TextareaField({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={classes("ui-input", "ui-textarea", className)} {...props} />;
}

export function SelectField({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={classes("ui-input", "ui-select", className)} {...props}>
      {children}
    </select>
  );
}

export function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="ui-switch">
      <span className="ui-switch__label">{label}</span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="ui-switch__track" aria-hidden="true" />
    </label>
  );
}

export function FileField({
  label,
  hint,
  selected = false,
  inputRef,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint: string;
  selected?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  return (
    <label className={classes("ui-file-field", selected && "is-selected", className)}>
      <input ref={inputRef} type="file" {...props} />
      <span>{label}</span>
      <small>{hint}</small>
    </label>
  );
}

export function Alert({
  title,
  children,
  tone = "info",
}: {
  title?: string;
  children: ReactNode;
  tone?: "info" | "success" | "warning" | "danger";
}) {
  return (
    <div className={classes("ui-alert", `ui-alert--${tone}`)} role={tone === "danger" ? "alert" : "status"}>
      <span className="ui-alert__icon" aria-hidden="true">
        {tone === "success" ? "✓" : tone === "warning" || tone === "danger" ? "!" : "i"}
      </span>
      <div>
        {title ? <strong>{title}</strong> : null}
        <div>{children}</div>
      </div>
    </div>
  );
}

export function Skeleton({ width = "100%", height = 16 }: { width?: string; height?: number }) {
  return <span className="ui-skeleton" style={{ width, height }} aria-hidden="true" />;
}

export interface StepperStep {
  id: string;
  label: string;
  description?: string;
}

export type StepperSaveStatus = "idle" | "saving" | "saved" | "error";

export function Stepper({
  steps,
  currentStep,
  completedSteps,
  saveStatus = "idle",
  onStepChange,
  className,
}: {
  steps: StepperStep[];
  currentStep: string;
  completedSteps?: string[];
  saveStatus?: StepperSaveStatus;
  onStepChange?: (stepId: string) => void;
  className?: string;
}) {
  const currentIndex = steps.findIndex((step) => step.id === currentStep);
  const completed = new Set(
    completedSteps ?? steps.slice(0, Math.max(currentIndex, 0)).map((step) => step.id),
  );
  const saveCopy: Record<StepperSaveStatus, string> = {
    idle: "Черновик сохраняется автоматически",
    saving: "Сохраняем изменения…",
    saved: "Все изменения сохранены",
    error: "Не удалось сохранить черновик",
  };

  return (
    <div className={classes("ui-stepper", className)}>
      <ol
        className="ui-stepper__list"
        aria-label="Шаги создания поездки"
        style={{ "--stepper-columns": steps.length } as CSSProperties}
      >
        {steps.map((step, index) => {
          const isCurrent = step.id === currentStep;
          const isCompleted = completed.has(step.id);
          const canNavigate = isCompleted && Boolean(onStepChange);
          const content = (
            <>
              <span className="ui-stepper__marker" aria-hidden="true">
                {isCompleted ? "✓" : index + 1}
              </span>
              <span className="ui-stepper__copy">
                <span className="ui-stepper__label">{step.label}</span>
                {step.description ? (
                  <span className="ui-stepper__description">{step.description}</span>
                ) : null}
              </span>
            </>
          );

          return (
            <li
              className={classes(
                "ui-stepper__step",
                isCurrent && "is-current",
                isCompleted && "is-completed",
              )}
              key={step.id}
            >
              {canNavigate ? (
                <button
                  className="ui-stepper__control"
                  type="button"
                  onClick={() => onStepChange?.(step.id)}
                  aria-label={`Вернуться к шагу «${step.label}»`}
                >
                  {content}
                </button>
              ) : (
                <div className="ui-stepper__control" aria-current={isCurrent ? "step" : undefined}>
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <div
        className={classes("ui-stepper__save", `ui-stepper__save--${saveStatus}`)}
        role="status"
        aria-live="polite"
      >
        <span className="ui-stepper__save-icon" aria-hidden="true">
          {saveStatus === "saving" ? "" : saveStatus === "error" ? "!" : saveStatus === "saved" ? "✓" : "●"}
        </span>
        {saveCopy[saveStatus]}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="ui-empty-state">
      <span className="ui-empty-state__icon" aria-hidden="true">↗</span>
      <h3>{title}</h3>
      <p>{children}</p>
      {action ? <div className="ui-empty-state__action">{action}</div> : null}
    </div>
  );
}

export function Dialog({
  open,
  title,
  description,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="ui-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="ui-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ui-dialog-title"
        aria-describedby={description ? "ui-dialog-description" : undefined}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="ui-dialog__close" type="button" aria-label="Закрыть" onClick={onClose}>×</button>
        <h2 id="ui-dialog-title">{title}</h2>
        {description ? <p id="ui-dialog-description">{description}</p> : null}
        {children}
      </section>
    </div>
  );
}

export function BottomSheet({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="ui-dialog-backdrop ui-bottom-sheet-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="ui-bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ui-bottom-sheet-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <span className="ui-bottom-sheet__handle" aria-hidden="true" />
        <div className="ui-bottom-sheet__heading">
          <h2 id="ui-bottom-sheet-title">{title}</h2>
          <button type="button" onClick={onClose}>Закрыть</button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function TripStatusBadge({ status }: { status: TripStatus }) {
  const tones: Record<TripStatus, BadgeTone> = {
    draft: "neutral",
    published: "success",
    cancelled: "danger",
    finished: "info",
  };
  return <Badge tone={tones[status]} dot>{tripStatusLabels[status]}</Badge>;
}

export function ParticipationStatusBadge({ status }: { status: ParticipantStatus }) {
  const tones: Record<ParticipantStatus, BadgeTone> = {
    pending: "warning",
    confirmed: "success",
    waitlisted: "info",
    cancelled: "neutral",
  };
  return <Badge tone={tones[status]}>{participantStatusLabels[status]}</Badge>;
}

export function DifficultyBadge({ difficulty }: { difficulty: DifficultyLevel }) {
  const tones: Record<DifficultyLevel, BadgeTone> = {
    easy: "success",
    medium: "warning",
    hard: "danger",
  };

  return <Badge tone={tones[difficulty]}>{difficultyLabels[difficulty]}</Badge>;
}

export interface TripCardProps {
  title: string;
  date: string;
  time: string;
  startLocationName: string;
  distanceKm: string | number;
  difficulty: DifficultyLevel;
  averageSpeed: string | number;
  maxParticipants?: string | number;
  coverImage: string;
  href?: string;
}

export function TripCard({
  title,
  date,
  time,
  startLocationName,
  distanceKm,
  difficulty,
  averageSpeed,
  maxParticipants,
  coverImage,
  href,
}: TripCardProps) {
  const titleContent = href ? <Link href={href}>{title}</Link> : title;

  return (
    <article className="trip-card">
      <div
        className="trip-card__cover"
        style={{
          backgroundImage: `linear-gradient(180deg, transparent, rgba(5, 18, 11, 0.52)), url("${coverImage}")`,
        }}
      >
        <span>{distanceKm || "—"} км</span>
      </div>
      <div className="trip-card__body">
        <p className="trip-card__date">
          {date || "Выберите дату"} · {time || "—:—"}
        </p>
        <h2>{titleContent}</h2>
        <p>{startLocationName || "Укажите место старта"}</p>
        <div className="trip-card__tags">
          <DifficultyBadge difficulty={difficulty} />
          <span>{averageSpeed || "—"} км/ч</span>
          {maxParticipants ? <span>{maxParticipants} мест</span> : null}
        </div>
      </div>
    </article>
  );
}

export function TripMeta({ trip }: { trip: Pick<TripSummary, "startDateTime" | "city" | "distanceKm"> }) {
  return (
    <div className="trip-meta">
      <span><span aria-hidden="true">◷</span>{formatDateTime(trip.startDateTime)}</span>
      <span><span aria-hidden="true">⌖</span>{trip.city}</span>
      <span><span aria-hidden="true">↔</span>{trip.distanceKm} км</span>
    </div>
  );
}

export function CapacityIndicator({
  capacity,
  confirmed,
}: {
  capacity: number;
  confirmed: number;
}) {
  const placesLeft = Math.max(capacity - confirmed, 0);
  const full = placesLeft === 0;
  const percentage = Math.min((confirmed / capacity) * 100, 100);

  return (
    <div className={classes("capacity", full && "is-full")}>
      <div className="capacity__copy">
        <strong>{full ? "Лист ожидания" : `${placesLeft} ${placesLeft === 1 ? "место" : "мест"} свободно`}</strong>
        <span>{confirmed} из {capacity}</span>
      </div>
      <div className="capacity__track" aria-label={`Занято ${confirmed} из ${capacity} мест`}>
        <span style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

export function ParticipantRow({
  participant,
  actions,
}: {
  participant: TripParticipant;
  actions?: ReactNode;
}) {
  const initials = participant.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="participant-row">
      <span className="participant-row__avatar" aria-hidden="true">{initials}</span>
      <div className="participant-row__person">
        <strong>{participant.name}</strong>
        <span>{participant.telegramUsername ? `@${participant.telegramUsername}` : "Telegram не указан"}</span>
      </div>
      <ParticipationStatusBadge status={participant.status} />
      {actions ? <div className="participant-row__actions">{actions}</div> : null}
    </div>
  );
}

export function TripFilters({
  value,
  onChange,
}: {
  value: TripFilterSelection;
  onChange: (value: TripFilterSelection) => void;
}) {
  const difficultyOptions = Object.entries(difficultyLabels) as Array<[DifficultyLevel, string]>;
  const bikeOptions = Object.entries(bikeTypeLabels) as Array<[BikeType, string]>;
  const toggleDifficulty = (option: DifficultyLevel) => {
    const selected = value.difficulty ?? [];
    const difficulty = selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option];

    onChange({ ...value, difficulty: difficulty.length ? difficulty : undefined });
  };
  const toggleBikeType = (option: BikeType) => {
    const selected = value.bikeType ?? [];
    const bikeType = selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option];

    onChange({ ...value, bikeType: bikeType.length ? bikeType : undefined });
  };

  return (
    <div className="trip-filters">
      <FormField label="Город">
        <TextField
          value={value.city ?? ""}
          placeholder="Москва"
          onChange={(event) => onChange({ ...value, city: event.target.value || undefined })}
        />
      </FormField>
      <FormField label="Дата">
        <TextField
          type="date"
          value={value.dateFrom ?? ""}
          onChange={(event) => onChange({ ...value, dateFrom: event.target.value || undefined })}
        />
      </FormField>
      <fieldset className="ui-field trip-filters__choice">
        <legend className="ui-field__label">Сложность маршрута</legend>
        <div className="trip-filters__options">
          {difficultyOptions.map(([option, label]) => (
            <Chip
              key={option}
              selected={value.difficulty?.includes(option)}
              onClick={() => toggleDifficulty(option)}
            >
              {label}
            </Chip>
          ))}
        </div>
      </fieldset>
      <fieldset className="ui-field trip-filters__choice">
        <legend className="ui-field__label">Велосипед</legend>
        <div className="trip-filters__options">
          {bikeOptions.map(([option, label]) => (
            <Chip
              key={option}
              selected={value.bikeType?.includes(option)}
              onClick={() => toggleBikeType(option)}
            >
              {label}
            </Chip>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

export type TripFilterSelection = Omit<TripFilterValues, "difficulty" | "bikeType"> & {
  difficulty?: DifficultyLevel[];
  bikeType?: BikeType[];
};

export function StickyActionBar({
  summary,
  primaryAction,
  secondaryAction,
}: {
  summary?: ReactNode;
  primaryAction: ReactNode;
  secondaryAction?: ReactNode;
}) {
  return (
    <div className="sticky-action-bar">
      {summary ? <div className="sticky-action-bar__summary">{summary}</div> : null}
      <div className="sticky-action-bar__actions">
        {secondaryAction}
        {primaryAction}
      </div>
    </div>
  );
}
