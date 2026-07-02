"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent, MouseEvent } from "react";
import type { TripDetail } from "@biketrips/domain";

import {
  bikeTypeLabels,
  difficultyLabels,
  surfaceLabels,
} from "../lib/labels";
import { Button, CapacityIndicator, TextField } from "./components";

export interface TripDetailsModalProps {
  open: boolean;
  trip: TripDetail;
  coverImage?: string;
  hasParticipantLimit?: boolean;
  onClose: () => void;
  onJoin?: (participant: { name: string; telegramUsername: string }) => void;
}

function Fact({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="trip-details-fact">
      <span className="trip-details-fact__icon" aria-hidden="true">{icon}</span>
      <span><small>{label}</small><strong>{value}</strong></span>
    </div>
  );
}

export function TripDetailsModal({
  open,
  trip,
  coverImage = "/img/Photo2.jpg",
  hasParticipantLimit = true,
  onClose,
  onJoin,
}: TripDetailsModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [joined, setJoined] = useState(false);
  const placesLeft = Math.max(trip.capacity - trip.confirmedParticipants, 0);
  const waitlist = hasParticipantLimit && placesLeft === 0;
  const date = new Intl.DateTimeFormat("ru-RU", {
    weekday: "long", day: "numeric", month: "long",
  }).format(new Date(trip.startDateTime));
  const time = new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(trip.startDateTime));

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => dialogRef.current?.focus());
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, open]);

  if (!open) return null;

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onJoin?.({
      name: String(form.get("name") ?? ""),
      telegramUsername: String(form.get("telegramUsername") ?? ""),
    });
    setJoined(true);
    setShowForm(false);
  }

  return (
    <div className="trip-details-backdrop" onMouseDown={handleBackdropClick}>
      <section
        className="trip-details-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
        tabIndex={-1}
      >
        <button className="trip-details-modal__close" type="button" onClick={onClose}>
          <span aria-hidden="true">×</span>
          <span className="sr-only">Закрыть карточку поездки</span>
        </button>

        <div className="trip-details-modal__hero">
          <img src={coverImage} alt="" />
          <div className="trip-details-modal__hero-shade" />
          <div className="trip-details-modal__hero-copy">
            <div className="trip-details-modal__eyebrow">
              <span>{trip.city}</span>
              <span>{difficultyLabels[trip.difficulty]}</span>
            </div>
            <p>{date} · {time}</p>
            <h2 id={titleId}>{trip.title}</h2>
            <span className="trip-details-modal__location">⌖ {trip.startLocationName}</span>
          </div>
        </div>

        <div className="trip-details-modal__layout">
          <div className="trip-details-modal__content">
            <div className="trip-details-modal__facts" aria-label="Параметры поездки">
              <Fact icon="↔" label="Дистанция" value={`${trip.distanceKm} км`} />
              <Fact icon="◷" label="Темп" value={trip.paceMin && trip.paceMax ? `${trip.paceMin}–${trip.paceMax} км/ч` : "Свободный"} />
              <Fact icon="◉" label="Велосипед" value={bikeTypeLabels[trip.bikeType]} />
              <Fact icon="≈" label="Покрытие" value={surfaceLabels[trip.surfaceType]} />
            </div>

            <section className="trip-details-section">
              <h3>О поездке</h3>
              <p>{trip.description}</p>
            </section>

            <details className="trip-details-disclosure" open>
              <summary>Маршрут и условия <span aria-hidden="true">⌄</span></summary>
              <div className="trip-details-disclosure__body">
                <p>{trip.routeDescription ?? "Организатор уточнит маршрут перед стартом."}</p>
                <dl>
                  <div><dt>Что взять</dt><dd>{trip.equipmentRequirements ?? "Исправный велосипед и воду."}</dd></div>
                  <div><dt>Правила группы</dt><dd>{trip.rules ?? "Следуем указаниям организатора и бережём группу."}</dd></div>
                </dl>
              </div>
            </details>

            <div className="trip-details-organizer">
              <span className="trip-details-organizer__avatar" aria-hidden="true">{trip.organizer.displayName.slice(0, 1)}</span>
              <span>
                <small>Организатор</small>
                <strong>{trip.organizer.displayName}{trip.organizer.isVerified ? <i title="Проверенный организатор">✓</i> : null}</strong>
              </span>
              <span className="trip-details-organizer__participants">{trip.confirmedParticipants} участников</span>
            </div>
          </div>

          <aside className="trip-details-modal__join" aria-label="Запись на поездку">
            {joined ? (
              <div className="trip-details-success" role="status">
                <span aria-hidden="true">✓</span>
                <h3>{waitlist ? "Вы в листе ожидания" : "Вы записаны!"}</h3>
                <p>{waitlist ? "Сообщим в Telegram, если освободится место." : "Детали и напоминание придут в Telegram."}</p>
              </div>
            ) : showForm ? (
              <form className="trip-details-join-form" onSubmit={handleSubmit}>
                <div><button type="button" onClick={() => setShowForm(false)} aria-label="Назад">←</button><h3>{waitlist ? "Встать в лист ожидания" : "Записаться"}</h3></div>
                <label><span>Как вас зовут</span><TextField name="name" placeholder="Алексей" required minLength={2} autoFocus /></label>
                <label><span>Telegram</span><TextField name="telegramUsername" placeholder="@username" required /></label>
                <Button type="submit">
                  {waitlist ? "Встать в лист ожидания" : hasParticipantLimit ? "Подтвердить запись" : "Записаться"}
                </Button>
                <small>Контакт увидит только организатор.</small>
              </form>
            ) : (
              <>
                <p className="trip-details-modal__join-kicker">{waitlist ? "Места закончились" : "Можно присоединиться"}</p>
                {hasParticipantLimit ? (
                  <CapacityIndicator capacity={trip.capacity} confirmed={trip.confirmedParticipants} />
                ) : (
                  <p className="trip-details-modal__participant-count">
                    Записались: <strong>{trip.confirmedParticipants}</strong> участников
                  </p>
                )}
                <Button size="large" onClick={() => setShowForm(true)}>
                  {waitlist ? "Встать в лист ожидания" : "Записаться"}
                </Button>
                <p className="trip-details-modal__join-note">{trip.registrationMode === "automatic" ? "Запись подтвердится сразу" : "Организатор подтвердит заявку"}</p>
              </>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}
