import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { hasAvailablePlaces, type TripDetail, type TripSummary } from "@biketrips/domain";

import {
  bikeTypeLabels,
  difficultyLabels,
  dropPolicyLabels,
  formatDateTime,
  participantStatusLabels,
  paceLabels,
  registrationModeLabels,
  surfaceLabels,
  tripStatusLabels,
} from "./labels";

interface DataNoticeProps {
  source: "api" | "demo";
  error?: string;
}

export function DataNotice({ source, error }: DataNoticeProps) {
  if (source === "api") return null;

  return (
    <div className="notice" role="status">
      API сейчас недоступен, поэтому показаны демо-данные. {error ? `Причина: ${error}` : null}
    </div>
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

export function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13 2 4 14h7l-1 8 10-13h-7l1-7Z" />
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

export function AppTopbar() {
  return (
    <header className="app-topbar">
      <Brand />
      <nav className="app-nav" aria-label="Навигация">
        <Link href="/">Поездки</Link>
        <Link href="/organizer/trips">Кабинет</Link>
        <Link className="section-create compact" href="/trips/new">
          <PlusIcon />
          Создать
        </Link>
      </nav>
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

export function TripCard({ trip }: { trip: TripSummary }) {
  const placesLabel = hasAvailablePlaces(trip) ? "Есть места" : "Лист ожидания";
  const cardTone = getCardTone(trip);

  return (
    <article className={`ride-card ${cardTone}`}>
      <Link className="ride-image" href={`/trips/${trip.slug}`} aria-label={trip.title}>
        <Image src={getTripImage(trip)} alt="" fill sizes="(max-width: 680px) 100vw, 160px" />
      </Link>
      <div className="ride-main">
        <div className="ride-title-row">
          <h3>
            <Link href={`/trips/${trip.slug}`}>{trip.title}</Link>
          </h3>
          <span className="ride-distance">{trip.distanceKm} км</span>
        </div>
        <div className="ride-details">
          <span>
            <ClockIcon />
            {formatDateTime(trip.startDateTime)}
          </span>
          <span>
            <PinIcon />
            {trip.city}
          </span>
        </div>
        <div className="ride-footer">
          <span className="difficulty">
            <BoltIcon />
            {difficultyLabels[trip.difficulty]}
          </span>
          <span className="spots">
            {trip.confirmedParticipants} из {trip.capacity} мест · {placesLabel}
          </span>
        </div>
      </div>
    </article>
  );
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
      <Metric label="Уровень" value={difficultyLabels[trip.difficulty]} />
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
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Участник</th>
            <th>Telegram</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>
          {trip.participants.map((participant) => (
            <tr key={participant.id}>
              <td>{participant.name}</td>
              <td>{participant.telegramUsername ? `@${participant.telegramUsername}` : "Не указан"}</td>
              <td>{participantStatusLabels[participant.status]}</td>
            </tr>
          ))}
        </tbody>
      </table>
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

function getCardTone(trip: TripSummary): string {
  if (trip.difficulty === "sport" || trip.difficulty === "hard") return "is-sport";
  if (trip.pace === "fast" || trip.pace === "training") return "is-fast";
  if (trip.difficulty === "beginner" || trip.difficulty === "easy") return "is-easy";
  return "is-medium";
}

function hashString(value: string): number {
  return value.split("").reduce((hash, char) => hash + char.charCodeAt(0), 0);
}
