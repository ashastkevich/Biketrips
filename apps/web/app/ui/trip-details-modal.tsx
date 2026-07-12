"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent, MouseEvent } from "react";
import type { ParticipantStatus, TripDetail } from "@biketrips/domain";

import { Button, CapacityIndicator, CloseButton, TextField } from "./components";
import { TripDetailsCard } from "./trip-details-card";
import styles from "./trip-details.module.css";

export interface TripDetailsModalProps {
  open: boolean;
  trip: TripDetail;
  coverImage?: string;
  isAuthenticated?: boolean;
  currentUserId: string | undefined;
  onClose: () => void;
  onJoin?: (participant?: { name: string; telegramUsername: string }) => void;
  returnPath?: "/" | "/profile";
  returnScope?: "feed" | "created" | "participating";
  savedChanges?: string[] | null;
  onSavedConfirmationClose?: () => void;
}

export function TripDetailsModal({
  open,
  trip,
  coverImage,
  isAuthenticated = false,
  currentUserId,
  onClose,
  onJoin,
  returnPath = "/",
  returnScope = "feed",
  savedChanges = null,
  onSavedConfirmationClose,
}: TripDetailsModalProps) {
  const titleId = useId();
  const cancelTitleId = useId();
  const router = useRouter();
  const dialogRef = useRef<HTMLElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [joined, setJoined] = useState(false);
  const isOrganizer = trip.organizer.userId === currentUserId;
  const [participationStatus, setParticipationStatus] = useState<ParticipantStatus | null>(null);
  const [participationLoading, setParticipationLoading] = useState(false);
  const [participationError, setParticipationError] = useState("");
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [showSavedConfirmation, setShowSavedConfirmation] = useState(savedChanges !== null);
  const [tripCancellationLoading, setTripCancellationLoading] = useState(false);
  const [tripCancellationError, setTripCancellationError] = useState("");
  const [tripCancelled, setTripCancelled] = useState(trip.status === "cancelled");
  const canCancelTrip =
    isOrganizer &&
    new Date(trip.startDateTime).getTime() > Date.now() &&
    trip.status !== "cancelled" &&
    trip.status !== "finished" &&
    !tripCancelled;
  const hasParticipantLimit = trip.capacity !== null;
  const placesLeft = Math.max((trip.capacity ?? 0) - trip.confirmedParticipants, 0);
  const waitlist = hasParticipantLimit && placesLeft === 0;
  const editTripHref =
    `/trips/${encodeURIComponent(trip.slug)}/edit` +
    `?returnTo=${encodeURIComponent(returnPath)}` +
    `&scope=${encodeURIComponent(returnScope)}`;
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (showSavedConfirmation) {
          setShowSavedConfirmation(false);
          onSavedConfirmationClose?.();
        } else if (showCancelConfirmation) {
          setTripCancellationError("");
          setShowCancelConfirmation(false);
        } else {
          onClose();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => dialogRef.current?.focus());
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [
    onClose,
    onSavedConfirmationClose,
    open,
    showCancelConfirmation,
    showSavedConfirmation,
  ]);

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

  async function handleCancelTrip() {
    setTripCancellationLoading(true);
    setTripCancellationError("");

    const response = await fetch(
      `/api/trips/${encodeURIComponent(trip.id)}/cancel`,
      { method: "POST" },
    ).catch(() => null);

    if (!response?.ok) {
      const error = await response?.json().catch(() => null) as { message?: string } | null;
      setTripCancellationError(error?.message ?? "Не удалось отменить поездку.");
      setTripCancellationLoading(false);
      return;
    }

    setTripCancelled(true);
    setShowCancelConfirmation(false);
    setTripCancellationLoading(false);
    if (window.history.state?.tripModal) {
      window.addEventListener("popstate", () => router.refresh(), { once: true });
      onClose();
    } else {
      onClose();
      router.refresh();
    }
  }

  return (
    <div className={styles.backdrop} onMouseDown={handleBackdropClick}>
      <TripDetailsCard
        trip={trip}
        coverImage={coverImage}
        titleId={titleId}
        role="dialog"
        ariaModal
        ref={dialogRef}
        tabIndex={-1}
        overlay={
          <CloseButton
            className={styles.close}
            label="Закрыть карточку поездки"
            tone="dark"
            onClick={onClose}
          />
        }
        aside={
          <aside
            className={styles.join}
            aria-label={isOrganizer ? "Участники поездки" : "Запись на поездку"}
          >
            {isOrganizer ? (
              <>
                <p className={styles.joinKicker}>Участники</p>
                <p className={styles.participantCount}>
                  Записались: <strong>{trip.confirmedParticipants}</strong>
                  {hasParticipantLimit ? ` из ${trip.capacity}` : " участников"}
                </p>
                {hasParticipantLimit ? (
                  <CapacityIndicator
                    capacity={trip.capacity!}
                    confirmed={trip.confirmedParticipants}
                  />
                ) : null}
                {canCancelTrip ? (
                  <Button
                    className={styles.joinButton}
                    tone="secondary"
                    onClick={() => {
                      window.location.assign(editTripHref);
                    }}
                  >
                    Редактировать поездку
                  </Button>
                ) : null}
                {tripCancelled ? (
                  <p className={styles.cancelled} role="status">
                    Поездка отменена
                  </p>
                ) : canCancelTrip ? (
                  <Button className={styles.joinButton} tone="danger" onClick={() => setShowCancelConfirmation(true)}>
                    Отменить поездку
                  </Button>
                ) : null}
              </>
            ) : participationStatus || joined ? (
              <div className={styles.success} role="status">
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
                  <p className={styles.error} role="alert">{participationError}</p>
                ) : null}
                {participationStatus ? (
                  <Button
                    className={`${styles.joinButton} ${styles.successButton}`}
                    tone="secondary"
                    disabled={participationLoading}
                    onClick={handleCancelParticipation}
                  >
                    {participationLoading ? "Отменяем…" : "Отменить запись"}
                  </Button>
                ) : null}
              </div>
            ) : showForm ? (
              <form className={styles.joinForm} onSubmit={handleSubmit}>
                <div><button type="button" onClick={() => setShowForm(false)} aria-label="Назад">←</button><h3>{waitlist ? "Встать в лист ожидания" : "Записаться"}</h3></div>
                <label><span>Как вас зовут</span><TextField name="name" placeholder="Алексей" required minLength={2} autoFocus /></label>
                <label><span>Telegram</span><TextField name="telegramUsername" placeholder="@username" required /></label>
                <Button className={styles.joinButton} type="submit">
                  {waitlist ? "Встать в лист ожидания" : hasParticipantLimit ? "Подтвердить запись" : "Записаться"}
                </Button>
                <small>Контакт увидит только организатор.</small>
              </form>
            ) : (
              <>
                <p className={styles.joinKicker}>{waitlist ? "Места закончились" : "Можно присоединиться"}</p>
                {hasParticipantLimit ? (
                  <CapacityIndicator capacity={trip.capacity!} confirmed={trip.confirmedParticipants} />
                ) : (
                  <p className={styles.participantCount}>
                    Записались: <strong>{trip.confirmedParticipants}</strong> участников
                  </p>
                )}
                {participationError ? (
                  <p className={styles.error} role="alert">{participationError}</p>
                ) : null}
                <Button className={styles.joinButton} size="large" disabled={participationLoading} onClick={handleJoin}>
                  {participationLoading
                    ? "Проверяем…"
                    : waitlist
                      ? "Встать в лист ожидания"
                      : "Записаться"}
                </Button>
                <p className={styles.joinNote}>{trip.registrationMode === "automatic" ? "Запись подтвердится сразу" : "Организатор подтвердит заявку"}</p>
              </>
            )}
          </aside>
        }
      />
      {showCancelConfirmation ? (
        <div className={styles.confirmBackdrop}>
          <section
            className={styles.confirm}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={cancelTitleId}
          >
            <h2 id={cancelTitleId}>Отменить поездку?</h2>
            <p>Поездка получит статус «Отменена». Участники увидят обновлённый статус.</p>
            {tripCancellationError ? (
              <p className={styles.error} role="alert">{tripCancellationError}</p>
            ) : null}
            <div className={styles.confirmActions}>
              <Button
                tone="danger"
                loading={tripCancellationLoading}
                onClick={handleCancelTrip}
              >
                Подтвердить отмену
              </Button>
              <Button
                tone="ghost"
                disabled={tripCancellationLoading}
                onClick={() => {
                  setTripCancellationError("");
                  setShowCancelConfirmation(false);
                }}
              >
                Не отменять
              </Button>
            </div>
          </section>
        </div>
      ) : null}
      {showSavedConfirmation ? (
        <div className={styles.confirmBackdrop}>
          <section
            className={styles.confirm}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${titleId}-saved`}
          >
            <h2 id={`${titleId}-saved`}>Успешно</h2>
            <p>Изменения сохранения</p>
            {savedChanges && savedChanges.length > 0 ? (
              <>
                <p><strong>Что изменилось:</strong></p>
                <ul>
                  {savedChanges.map((change) => <li key={change}>{change}</li>)}
                </ul>
              </>
            ) : (
              <p>Новых значений в полях не обнаружено.</p>
            )}
            <div className={`${styles.confirmActions} ${styles.confirmActionsCenter}`}>
              <Button
                onClick={() => {
                  setShowSavedConfirmation(false);
                  onSavedConfirmationClose?.();
                }}
              >
                Хорошо
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
