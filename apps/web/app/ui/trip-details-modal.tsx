"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent, MouseEvent } from "react";
import type { ParticipantStatus, TripDetail } from "@biketrips/domain";

import {
  difficultyLabels,
  formatSurfaceComposition,
  unpavedSurfaceDetailLabels,
} from "../lib/labels";
import { Button, CapacityIndicator, CloseButton, TextField } from "./components";

export interface TripDetailsModalProps {
  open: boolean;
  trip: TripDetail;
  coverImage?: string;
  isAuthenticated?: boolean;
  currentUserId: string | undefined;
  onClose: () => void;
  onJoin?: (participant?: { name: string; telegramUsername: string }) => void;
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
  coverImage,
  isAuthenticated = false,
  currentUserId,
  onClose,
  onJoin,
}: TripDetailsModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [joined, setJoined] = useState(false);
  const isOrganizer = trip.organizer.userId === currentUserId;
  const [participationStatus, setParticipationStatus] = useState<ParticipantStatus | null>(null);
  const [participationLoading, setParticipationLoading] = useState(false);
  const [participationError, setParticipationError] = useState("");
  const hasParticipantLimit = trip.capacity !== null;
  const placesLeft = Math.max((trip.capacity ?? 0) - trip.confirmedParticipants, 0);
  const waitlist = hasParticipantLimit && placesLeft === 0;
  const date = new Intl.DateTimeFormat("ru-RU", {
    weekday: "long", day: "numeric", month: "long",
  }).format(new Date(trip.startDateTime));
  const time = new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(trip.startDateTime));
  const hasRouteConditions = Boolean(
    trip.routeDescription ||
      trip.equipmentRequirements ||
      trip.rules ||
      trip.unpavedSurfaceDetails.length,
  );

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

  useEffect(() => {
    if (!open || !isAuthenticated) return;

    let active = true;
    setParticipationLoading(true);
    setParticipationError("");

    fetch(`/api/trips/${encodeURIComponent(trip.id)}/participation`, {
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Не удалось проверить запись");
        return response.json() as Promise<{ status?: ParticipantStatus } | null>;
      })
      .then((participation) => {
        if (!active) return;
        setParticipationStatus(
          participation?.status && participation.status !== "cancelled"
            ? participation.status
            : null,
        );
      })
      .catch(() => {
        if (active) setParticipationError("Не удалось проверить вашу запись. Попробуйте ещё раз.");
      })
      .finally(() => {
        if (active) setParticipationLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated, open, trip.id]);

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

  async function handleJoin() {
    if (isAuthenticated) {
      setParticipationLoading(true);
      setParticipationError("");

      const response = await fetch(
        `/api/trips/${encodeURIComponent(trip.id)}/participation`,
        { method: "POST" },
      ).catch(() => null);

      if (!response?.ok) {
        const error = await response?.json().catch(() => null) as { message?: string } | null;
        setParticipationError(
          response?.status === 404
            ? "Поездка не найдена в базе. Обновите страницу и попробуйте снова."
            : error?.message ?? "Не удалось записаться на поездку. Попробуйте ещё раз.",
        );
        setParticipationLoading(false);
        return;
      }

      const participation = await response.json() as { status: ParticipantStatus };
      setParticipationStatus(participation.status);
      setParticipationLoading(false);
      onJoin?.();
      setJoined(true);
      return;
    }

    setShowForm(true);
  }

  async function handleCancelParticipation() {
    setParticipationLoading(true);
    setParticipationError("");

    const response = await fetch(
      `/api/trips/${encodeURIComponent(trip.id)}/participation`,
      { method: "DELETE" },
    ).catch(() => null);

    if (!response?.ok) {
      setParticipationError("Не удалось отменить запись. Попробуйте ещё раз.");
      setParticipationLoading(false);
      return;
    }

    setParticipationStatus(null);
    setJoined(false);
    setParticipationLoading(false);
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
        <CloseButton
          className="trip-details-modal__close"
          label="Закрыть карточку поездки"
          tone="dark"
          onClick={onClose}
        />

        <div className="trip-details-modal__hero">
          {coverImage ? <img src={coverImage} alt="" /> : null}
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
              <Fact
                icon="≈"
                label="Покрытие"
                value={formatSurfaceComposition(trip.asphaltPercent, trip.unpavedPercent)}
              />
            </div>

            <section className="trip-details-section">
              <h3>О поездке</h3>
              <p>{trip.description}</p>
            </section>

            {hasRouteConditions ? (
            <details className="trip-details-disclosure" open>
              <summary>Маршрут и условия <span aria-hidden="true">⌄</span></summary>
              <div className="trip-details-disclosure__body">
                {trip.routeDescription ? <p>{trip.routeDescription}</p> : null}
                <dl>
                  {trip.unpavedSurfaceDetails.length > 0 ? (
                    <div>
                      <dt>Грунтовая часть</dt>
                      <dd>
                        {trip.unpavedSurfaceDetails
                          .map((detail) => unpavedSurfaceDetailLabels[detail])
                          .join(", ")}
                      </dd>
                    </div>
                  ) : null}
                  {trip.equipmentRequirements ? (
                    <div><dt>Что взять</dt><dd>{trip.equipmentRequirements}</dd></div>
                  ) : null}
                  {trip.rules ? (
                    <div><dt>Правила группы</dt><dd>{trip.rules}</dd></div>
                  ) : null}
                </dl>
              </div>
            </details>
            ) : null}

            <div className="trip-details-organizer">
              <span className="trip-details-organizer__avatar" aria-hidden="true">{trip.organizer.displayName.slice(0, 1)}</span>
              <span>
                <small>Организатор</small>
                <strong>{trip.organizer.displayName}{trip.organizer.isVerified ? <i title="Проверенный организатор">✓</i> : null}</strong>
              </span>
              <span className="trip-details-organizer__participants">{trip.confirmedParticipants} участников</span>
            </div>
          </div>

          <aside
            className="trip-details-modal__join"
            aria-label={isOrganizer ? "Участники поездки" : "Запись на поездку"}
          >
            {isOrganizer ? (
              <>
                <p className="trip-details-modal__join-kicker">Участники</p>
                <p className="trip-details-modal__participant-count">
                  Записались: <strong>{trip.confirmedParticipants}</strong>
                  {hasParticipantLimit ? ` из ${trip.capacity}` : " участников"}
                </p>
                {hasParticipantLimit ? (
                  <CapacityIndicator
                    capacity={trip.capacity!}
                    confirmed={trip.confirmedParticipants}
                  />
                ) : null}
              </>
            ) : participationStatus || joined ? (
              <div className="trip-details-success" role="status">
                <span aria-hidden="true">✓</span>
                <h3>
                  {(participationStatus === "waitlisted" || (!participationStatus && waitlist))
                    ? "Вы в листе ожидания"
                    : joined
                      ? "Вы успешно записаны!"
                      : "Вы уже записаны"}
                </h3>
                <p>
                  {(participationStatus === "waitlisted" || (!participationStatus && waitlist))
                    ? "Сообщим, если освободится место."
                    : "Эта поездка добавлена в ваш список."}
                </p>
                {participationError ? (
                  <p className="trip-details-modal__error" role="alert">{participationError}</p>
                ) : null}
                {participationStatus ? (
                  <Button
                    tone="secondary"
                    disabled={participationLoading}
                    onClick={handleCancelParticipation}
                  >
                    {participationLoading ? "Отменяем…" : "Отменить запись"}
                  </Button>
                ) : null}
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
                  <CapacityIndicator capacity={trip.capacity!} confirmed={trip.confirmedParticipants} />
                ) : (
                  <p className="trip-details-modal__participant-count">
                    Записались: <strong>{trip.confirmedParticipants}</strong> участников
                  </p>
                )}
                {participationError ? (
                  <p className="trip-details-modal__error" role="alert">{participationError}</p>
                ) : null}
                <Button size="large" disabled={participationLoading} onClick={handleJoin}>
                  {participationLoading
                    ? "Проверяем…"
                    : waitlist
                      ? "Встать в лист ожидания"
                      : "Записаться"}
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
