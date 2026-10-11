"use client";

import { useEffect, useId, useRef, useState } from "react";
import type {
  CSSProperties,
  InputHTMLAttributes,
  RefObject,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import type { DifficultyLevel } from "@biketrips/domain";
import { difficultyDescriptions, difficultyLabels } from "../lib/labels";
import styles from "./components.module.css";
import { classes } from "./class-names";

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
      className={classes(styles.chip, selected && styles.selected)}
      type="button"
      aria-pressed={selected}
      onClick={onClick}
    >
      {children}
    </button>
  );
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
    <label className={classes(styles.field, error && styles.fieldHasError, className)}>
      <span className={styles.fieldLabel}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      {children}
      {error ? <span className={styles.fieldError}>{error}</span> : null}
      {!error && hint ? <span className={styles.fieldHint}>{hint}</span> : null}
    </label>
  );
}

export function TextField({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={classes(styles.input, className)} {...props} />;
}

export function TextareaField({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={classes(styles.input, styles.textarea, className)} {...props} />;
}

export function SelectField({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={classes(styles.input, styles.select, className)} {...props}>
      {children}
    </select>
  );
}

export function DifficultySelect({
  value,
  onChange,
  name,
}: {
  value: DifficultyLevel;
  onChange: (value: DifficultyLevel) => void;
  name?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const options = Object.entries(difficultyLabels) as Array<[DifficultyLevel, string]>;

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className={styles.difficultySelect} ref={rootRef}>
      {name ? <input name={name} type="hidden" value={value} /> : null}
      <button
        className={styles.difficultySelectTrigger}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={`Сложность маршрута: ${difficultyLabels[value]}`}
        onClick={() => setOpen((current) => !current)}
      >
        <span
          className={classes(
            styles.difficultySelectMarker,
            value === "beginner" && styles.difficultySelectMarkerBeginner,
            value === "medium" && styles.difficultySelectMarkerMedium,
            value === "hard" && styles.difficultySelectMarkerHard,
            value === "sport" && styles.difficultySelectMarkerSport,
          )}
          aria-hidden="true"
        />
        <span className={styles.difficultySelectTriggerCopy}>
          <strong>{difficultyLabels[value]}</strong>
          <span>{difficultyDescriptions[value]}</span>
        </span>
        <span className={styles.difficultySelectChevron} aria-hidden="true">
          ⌄
        </span>
      </button>
      {open ? (
        <div
          className={styles.difficultySelectMenu}
          id={listboxId}
          role="listbox"
          aria-label="Сложность маршрута"
        >
          {options.map(([option, label]) => (
            <button
              className={classes(
                styles.difficultySelectOption,
                option === value && styles.difficultySelectOptionSelected,
              )}
              key={option}
              type="button"
              role="option"
              aria-selected={option === value}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
            >
              <span
                className={classes(
                  styles.difficultySelectMarker,
                  option === "beginner" && styles.difficultySelectMarkerBeginner,
                  option === "medium" && styles.difficultySelectMarkerMedium,
                  option === "hard" && styles.difficultySelectMarkerHard,
                  option === "sport" && styles.difficultySelectMarkerSport,
                )}
                aria-hidden="true"
              />
              <span className={styles.difficultySelectOptionCopy}>
                <strong>{label}</strong>
                <span>{difficultyDescriptions[option]}</span>
              </span>
              <span className={styles.difficultySelectCheck} aria-hidden="true">
                {option === value ? "✓" : ""}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
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
    <label className={styles.switch}>
      <span className={styles.switchLabel}>{label}</span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className={styles.switchTrack} aria-hidden="true" />
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
    <label className={classes(styles.fileField, selected && styles.fileFieldSelected, className)}>
      <input ref={inputRef} type="file" {...props} />
      <span>{label}</span>
      <small>{hint}</small>
    </label>
  );
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
    <div className={classes(styles.stepper, className)}>
      <ol
        className={styles.stepperList}
        aria-label="Шаги создания поездки"
        style={{ "--stepper-columns": steps.length } as CSSProperties}
      >
        {steps.map((step, index) => {
          const isCurrent = step.id === currentStep;
          const isCompleted = completed.has(step.id);
          const canNavigate = isCompleted && Boolean(onStepChange);
          const content = (
            <>
              <span className={styles.stepperMarker} aria-hidden="true">
                {isCompleted ? "✓" : index + 1}
              </span>
              <span className={styles.stepperCopy}>
                <span className={styles.stepperLabel}>{step.label}</span>
                {step.description ? (
                  <span className={styles.stepperDescription}>{step.description}</span>
                ) : null}
              </span>
            </>
          );

          return (
            <li
              className={classes(
                styles.stepperStep,
                isCurrent && styles.stepperStepCurrent,
                isCompleted && styles.stepperStepCompleted,
              )}
              key={step.id}
            >
              {canNavigate ? (
                <button
                  className={styles.stepperControl}
                  type="button"
                  onClick={() => onStepChange?.(step.id)}
                  aria-label={`Вернуться к шагу «${step.label}»`}
                >
                  {content}
                </button>
              ) : (
                <div className={styles.stepperControl} aria-current={isCurrent ? "step" : undefined}>
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <div
        className={classes(
          styles.stepperSave,
          saveStatus === "saving" && styles.stepperSaveSaving,
          saveStatus === "error" && styles.stepperSaveError,
        )}
        role="status"
        aria-live="polite"
      >
        <span className={styles.stepperSaveIcon} aria-hidden="true">
          {saveStatus === "saving" ? "" : saveStatus === "error" ? "!" : saveStatus === "saved" ? "✓" : "●"}
        </span>
        {saveCopy[saveStatus]}
      </div>
    </div>
  );
}
