"use client";

import Link from "next/link";
import Image from "next/image";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { DifficultyLevel } from "@biketrips/domain";
import { difficultyLabels } from "../lib/labels";
import styles from "./components.module.css";
import tripCardStyles from "./trip-card.module.css";
import { preloadTripHeroImage } from "./trip-hero-image";
import { classes } from "./class-names";

type ButtonTone = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "small" | "medium" | "large";
const buttonToneClasses: Record<ButtonTone, string | undefined> = {
  primary: styles.buttonPrimary,
  secondary: styles.buttonSecondary,
  ghost: styles.buttonGhost,
  danger: styles.buttonDanger,
};
const buttonSizeClasses: Record<ButtonSize, string | undefined> = {
  small: styles.buttonSmall,
  medium: styles.buttonMedium,
  large: styles.buttonLarge,
};

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
      className={classes(styles.button, buttonToneClasses[tone], buttonSizeClasses[size], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
      <span className={styles.buttonLabel} data-button-label>{children}</span>
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
  // In-page anchors stay plain links: the Next.js router does not scroll again when the hash is unchanged.
  // External links (Telegram sign-up of imported trips) open in a new tab.
  const isExternal = /^https?:\/\//.test(href);
  const ButtonLink = href.startsWith("#") || isExternal ? "a" : Link;

  return (
    <ButtonLink
      className={classes(styles.button, buttonToneClasses[tone], buttonSizeClasses[size], className)}
      href={href}
      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      <span className={styles.buttonLabel} data-button-label>{children}</span>
    </ButtonLink>
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
      className={classes(
        styles.iconButton,
        tone === "dark" && styles.iconButtonDark,
        className,
      )}
      type="button"
      aria-label={label}
      {...props}
    >
      {children}
    </button>
  );
}

export function CloseButton({
  label = "Закрыть",
  tone = "secondary",
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label"> & {
  label?: string;
  tone?: "secondary" | "dark";
}) {
  return (
    <IconButton label={label} tone={tone} {...props}>
      <svg
        className={styles.closeButtonIcon}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="m6 6 12 12M18 6 6 18" />
      </svg>
    </IconButton>
  );
}

export type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";
const badgeToneClasses: Record<BadgeTone, string | undefined> = {
  neutral: undefined,
  brand: styles.badgeBrand,
  success: styles.badgeSuccess,
  warning: styles.badgeWarning,
  danger: styles.badgeDanger,
  info: styles.badgeInfo,
};

export function Badge({
  children,
  tone = "neutral",
  dot = false,
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span className={classes(styles.badge, badgeToneClasses[tone], className)}>
      {dot ? <span className={styles.badgeDot} aria-hidden="true" /> : null}
      {children}
    </span>
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
  const paddingClass = {
    none: styles.cardNone,
    small: styles.cardSmall,
    medium: styles.cardMedium,
    large: styles.cardLarge,
  }[padding];

  return <div className={classes(styles.card, paddingClass, className)}>{children}</div>;
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
    <div
      className={classes(
        styles.alert,
        tone === "success" && styles.alertSuccess,
        tone === "warning" && styles.alertWarning,
        tone === "danger" && styles.alertDanger,
      )}
      role={tone === "danger" ? "alert" : "status"}
    >
      <span className={styles.alertIcon} aria-hidden="true">
        {tone === "success" ? "✓" : tone === "warning" || tone === "danger" ? "!" : "i"}
      </span>
      <div>
        {title ? <strong>{title}</strong> : null}
        <div>{children}</div>
      </div>
    </div>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty: DifficultyLevel }) {
  const tones: Record<DifficultyLevel, BadgeTone> = {
    beginner: "info",
    easy: "success",
    medium: "warning",
    hard: "danger",
    sport: "brand",
  };

  return <Badge tone={tones[difficulty]}>{difficultyLabels[difficulty]}</Badge>;
}

export interface TripCardProps {
  title: string;
  date: string;
  time: string;
  startLocationName: string;
  /** null for imported trips that did not state it; the card then leaves it out. */
  distanceKm: string | number | null;
  difficulty: DifficultyLevel | null;
  averageSpeed: string | number;
  maxParticipants?: string | number;
  coverImage?: string;
  /**
   * Show the whole cover on a blurred copy of itself in a taller 4:3 frame instead of
   * cropping it to the strip. Imported posters are square or portrait.
   */
  fitCover?: boolean;
  href?: string;
  onOpen?: () => void;
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
  fitCover = false,
  href,
  onOpen,
}: TripCardProps) {
  // A real link keeps trip pages crawlable; with onOpen, plain clicks open the modal instead.
  const titleContent = href ? (
    <Link
      href={href}
      onClick={onOpen ? (event) => {
        event.stopPropagation();
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
          return;
        }
        event.preventDefault();
        onOpen();
      } : undefined}
    >
      {title}
    </Link>
  ) : title;
  const cardIsButton = Boolean(onOpen) && !href;
  // Cards that open the trip modal warm up its large cover as soon as the visitor aims at them.
  const preloadHero = onOpen ? () => preloadTripHeroImage(coverImage) : undefined;

  return (
    <article
      className={classes(tripCardStyles.card, onOpen && tripCardStyles.interactive)}
      role={cardIsButton ? "button" : undefined}
      tabIndex={cardIsButton ? 0 : undefined}
      aria-label={cardIsButton ? `Открыть поездку «${title}»` : undefined}
      onClick={onOpen}
      onPointerEnter={preloadHero}
      onPointerDown={preloadHero}
      onFocus={preloadHero}
      onKeyDown={cardIsButton && onOpen ? (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      } : undefined}
    >
      <div
        className={classes(
          tripCardStyles.cover,
          !coverImage && tripCardStyles.coverFallback,
          fitCover && coverImage && tripCardStyles.coverFit,
        )}
      >
        {coverImage && fitCover ? (
          <Image
            className={tripCardStyles.coverBackdrop}
            src={coverImage}
            alt=""
            aria-hidden="true"
            fill
            sizes="(max-width: 760px) 100vw, 360px"
          />
        ) : null}
        {coverImage ? (
          <Image
            className={tripCardStyles.coverImage}
            src={coverImage}
            alt=""
            fill
            sizes="(max-width: 760px) 100vw, 360px"
          />
        ) : null}
        <div className={tripCardStyles.coverShade} aria-hidden="true" />
        {distanceKm === null ? null : <span>{distanceKm || "—"} км</span>}
      </div>
      <div className={tripCardStyles.body}>
        <p className={tripCardStyles.date}>
          {date || "Выберите дату"} · {time || "—:—"}
        </p>
        <h2>{titleContent}</h2>
        <p title={startLocationName || undefined}>
          {startLocationName ? <span aria-hidden="true">⌖ </span> : null}
          {startLocationName || "Укажите место старта"}
        </p>
        <div className={tripCardStyles.tags}>
          {difficulty ? <DifficultyBadge difficulty={difficulty} /> : null}
          <span className={tripCardStyles.tagText}>{averageSpeed || "—"} км/ч</span>
          {maxParticipants ? <span className={tripCardStyles.tagText}>{maxParticipants} мест</span> : null}
        </div>
      </div>
    </article>
  );
}

export function CapacityIndicator({
  capacity,
  className,
  confirmed,
}: {
  capacity: number;
  className?: string;
  confirmed: number;
}) {
  const placesLeft = Math.max(capacity - confirmed, 0);
  const full = placesLeft === 0;
  const percentage = Math.min((confirmed / capacity) * 100, 100);

  return (
    <div className={classes(styles.capacity, full && styles.capacityFull, className)}>
      <div className={styles.capacityCopy}>
        <strong>{full ? "Лист ожидания" : `${placesLeft} ${placesLeft === 1 ? "место" : "мест"} свободно`}</strong>
        <span>{confirmed} из {capacity}</span>
      </div>
      <div className={styles.capacityTrack} aria-label={`Занято ${confirmed} из ${capacity} мест`}>
        <span style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
