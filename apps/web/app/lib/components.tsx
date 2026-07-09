import type { ReactNode } from "react";
import type { TripDetail, TripSummary } from "@biketrips/domain";

import {
  difficultyLabels,
  dropPolicyLabels,
  formatDateTime,
  paceLabels,
  registrationModeLabels,
  formatSurfaceComposition,
  tripStatusLabels,
} from "./labels";
import { CreateTripLauncher } from "./create-trip-launcher";
import { ProfileMenu } from "../home-auth-control";
import {
  Alert,
  LinkButton,
  ParticipantRow,
} from "../ui/components";
import type { TripCardProps } from "../ui/components";

interface DataNoticeProps {
  source: "api" | "unavailable";
  error?: string;
}

export function DataNotice({ source, error }: DataNoticeProps) {
  if (source === "api") return null;

  return (
    <Alert title="Не удалось загрузить данные" tone="warning">
      Сервис поездок сейчас недоступен.{error ? ` Причина: ${error}` : null}
    </Alert>
  );
}

export function BikeIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path
        d="M11 32c0-12.7 9.5-21 21-21s21 8.3 21 21-9.5 21-21 21-21-8.3-21-21Z"
        fill="currentColor"
        opacity="0.18"
      />
      <path
        d="M18 25c5.6-7.5 19.9-9.3 29 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3.2"
        opacity="0.58"
      />
      <circle cx="20" cy="40" r="7" stroke="currentColor" strokeWidth="4.2" />
      <circle cx="44" cy="40" r="7" stroke="currentColor" strokeWidth="4.2" />
      <path
        d="M20 40h11l6-15M31 40l-7-13h14l6 13"
        stroke="var(--brand-bike-frame, #404823)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4.2"
      />
      <path
        d="M43 16a5 5 0 0 1 5 5c0 4.2-5 8.2-5 8.2S38 25.2 38 21a5 5 0 0 1 5-5Z"
        fill="currentColor"
      />
      <circle cx="43" cy="21" r="1.8" fill="var(--brand-bike-dot, #cbd5ab)" />
    </svg>
  );
}

export function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
    </svg>
  );
}

export function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8v4l3 2" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

export function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21s7-5.1 7-11a7 7 0 1 0-14 0c0 5.9 7 11 7 11Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function Brand({ tone = "dark", href = "/" }: { tone?: "dark" | "light"; href?: string }) {
  return (
    <a className={`brand ${tone === "light" ? "brand-light" : ""}`} href={href} aria-label="BikeTrips">
      <span className="brand-icon">
        <BikeIcon />
      </span>
      BikeTrips
    </a>
  );
}

export function AppTopbar({
  showNavigation = true,
  showCreateAction = true,
}: {
  showNavigation?: boolean;
  showCreateAction?: boolean;
}) {
  return (
    <header className="site-header site-header--app">
      <div className="site-header__inner">
        <Brand />
        {showNavigation ? (
          <nav className="site-nav app-nav" aria-label="Навигация">
            <LinkButton className="app-nav__action" href="/#rides">
              <ArrowIcon />
              <span>Найти поездку</span>
            </LinkButton>
            {showCreateAction ? (
              <CreateTripLauncher
                className="app-nav__action"
                label="Создать поездку"
                tone="secondary"
              />
            ) : null}
            <ProfileMenu tone="dark" />
          </nav>
        ) : <ProfileMenu tone="dark" />}
      </div>
    </header>
  );
}

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, children, actions }: PageHeaderProps) {
  return (
    <section className="page-header">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {children ? <div className="lead">{children}</div> : null}
      </div>
      {actions ? <div className="header-actions">{actions}</div> : null}
    </section>
  );
}

export function getTripCardProps(
  trip: TripSummary & Partial<Pick<TripDetail, "startLocationName" | "paceMin" | "paceMax">>,
): TripCardProps {
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
  const paceFallback = {
    relaxed: 18,
    steady: 22,
    fast: 26,
    training: 30,
  }[trip.pace];
  const averageSpeed = Math.round(
    ((trip.paceMin ?? paceFallback) + (trip.paceMax ?? paceFallback)) / 2,
  );

  return {
    title: trip.title,
    date,
    time,
    startLocationName: trip.startLocationName ?? trip.city,
    distanceKm: trip.distanceKm,
    difficulty: trip.difficulty,
    averageSpeed,
    maxParticipants: trip.capacity ?? undefined,
    coverImage: getTripImage(trip),
    href: `/trips/${trip.slug}`,
  };
}

export function TripFacts({ trip }: { trip: TripDetail }) {
  return (
    <dl className="facts-grid">
      <Metric label="Старт" value={formatDateTime(trip.startDateTime)} />
      <Metric label="Место" value={trip.startLocationName} />
      <Metric label="Дистанция" value={`${trip.distanceKm} км`} />
      <Metric
        label="Темп"
        value={trip.paceMin && trip.paceMax ? `${trip.paceMin}-${trip.paceMax} км/ч` : paceLabels[trip.pace]}
      />
      <Metric label="Сложность маршрута" value={difficultyLabels[trip.difficulty]} />
      <Metric
        label="Покрытие"
        value={formatSurfaceComposition(trip.asphaltPercent, trip.unpavedPercent)}
      />
      <Metric label="Формат" value={dropPolicyLabels[trip.dropPolicy]} />
      <Metric label="Запись" value={registrationModeLabels[trip.registrationMode]} />
      <Metric label="Статус" value={tripStatusLabels[trip.status]} />
    </dl>
  );
}

export function ParticipantList({ trip }: { trip: TripDetail }) {
  if (trip.participants.length === 0) {
    return <p className="muted">Пока никто не записался.</p>;
  }

  return (
    <div className="participant-list">
      {trip.participants.map((participant) => (
        <ParticipantRow participant={participant} key={participant.id} />
      ))}
    </div>
  );
}

export function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function getTripImage(trip: TripSummary): string | undefined {
  return trip.coverImage ?? undefined;
}
