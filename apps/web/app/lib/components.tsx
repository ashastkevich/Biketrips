import Link from "next/link";
import type { ReactNode } from "react";
import type { TripDetail, TripSummary } from "@biketrips/domain";

import {
  bikeTypeLabels,
  difficultyLabels,
  dropPolicyLabels,
  formatDateTime,
  paceLabels,
  registrationModeLabels,
  surfaceLabels,
  tripStatusLabels,
} from "./labels";
import { CreateTripLauncher } from "./create-trip-launcher";
import {
  Alert,
  ParticipantRow,
} from "../ui/components";
import type { TripCardProps } from "../ui/components";

interface DataNoticeProps {
  source: "api" | "demo";
  error?: string;
}

export function DataNotice({ source, error }: DataNoticeProps) {
  if (source === "api") return null;

  return (
    <Alert title="Показаны демо-данные" tone="warning">
      API сейчас недоступен.{error ? ` Причина: ${error}` : null}
    </Alert>
  );
}

export function BikeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="6.5" cy="16.5" r="3.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="16.5" r="3.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M9 16.5h3.5l2.4-6.5M8.5 10h4.8l4.2 6.5M10.4 6.5h3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
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

export function Brand({ tone = "dark" }: { tone?: "dark" | "light" }) {
  return (
    <Link className={`brand ${tone === "light" ? "brand-light" : ""}`} href="/" aria-label="BikeTrips">
      <span className="brand-icon">
        <BikeIcon />
      </span>
      BikeTrips
    </Link>
  );
}

export function AppTopbar({ showNavigation = true }: { showNavigation?: boolean }) {
  return (
    <header className="app-topbar">
      <Brand />
      {showNavigation ? (
        <nav className="app-nav" aria-label="Навигация">
          <Link href="/">Поездки</Link>
          <Link href="/organizer/trips">Кабинет</Link>
          <CreateTripLauncher compact label="Создать" />
        </nav>
      ) : null}
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
    maxParticipants: trip.capacity,
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
      <Metric label="Велосипед" value={bikeTypeLabels[trip.bikeType]} />
      <Metric label="Покрытие" value={surfaceLabels[trip.surfaceType]} />
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

function getTripImage(trip: TripSummary): string {
  const fallbackImage = "/img/Photo1.jpg";
  const images = ["/img/Photo1.jpg", "/img/Photo2.jpg", "/img/Photo3.jpg", "/img/Photo4.jpg"];
  const index = Math.abs(hashString(trip.id || trip.slug)) % images.length;
  return images[index] ?? fallbackImage;
}

function hashString(value: string): number {
  return value.split("").reduce((hash, char) => hash + char.charCodeAt(0), 0);
}
