"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { MouseEvent } from "react";
import { canRegisterOnSite, type ParticipantStatus, type TripDetail } from "@biketrips/domain";

import { countPendingRequests, formatPendingRequests } from "../lib/participant-groups";
import { getTripEditHref, getTripHref } from "../lib/trip-links";
import { Button, CapacityIndicator, CloseButton } from "./components";
import { ExternalRegistration } from "./external-registration";
import { JoinSignInButton } from "./join-sign-in-button";
import { TripDetailsCard } from "./trip-details-card";
import styles from "./trip-details.module.css";

// The feed and profile keep the trip list they were rendered with, so signups changed in this
// modal are remembered here; otherwise reopening it would briefly show the stale status.
const knownParticipation = new Map<string, ParticipantStatus | null>();

export interface TripDetailsModalProps {
  open: boolean;
  trip: TripDetail;
  coverImage?: string;
  isAuthenticated?: boolean;
  currentUserId: string | undefined;
  onClose: () => void;
  onJoin?: () => void;
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
  const [joined, setJoined] = useState(false);
  const isOrganizer = trip.organizer.userId === currentUserId;
  // The trip payload already lists participants, so the panel can render the right state
  // immediately; the request below only re-checks it in the background.
  const participationKey = `${currentUserId}:${trip.id}`;
  const renderedStatus =
    trip.participants.find(
      (participant) => participant.userId === currentUserId && participant.status !== "cancelled",
    )?.status ?? null;
  const [participationStatus, setStatus] = useState<ParticipantStatus | null>(() =>
    knownParticipation.has(participationKey)
      ? knownParticipation.get(participationKey)!
      : renderedStatus,
  );
  function setParticipationStatus(status: ParticipantStatus | null) {
    knownParticipation.set(participationKey, status);
    setStatus(status);
  }
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
  const pendingRequests = isOrganizer ? countPendingRequests(trip) : 0;
  // trip.confirmedParticipants was counted with the status the page was rendered with;
  // correct it by the viewer's own signup changed since then.
  const confirmedParticipants =
    trip.confirmedParticipants -
    (renderedStatus === "confirmed" ? 1 : 0) +
    (participationStatus === "confirmed" ? 1 : 0);
  const placesLeft = Math.max((trip.capacity ?? 0) - confirmedParticipants, 0);
  const waitlist = hasParticipantLimit && placesLeft === 0;
  const editTripHref = getTripEditHref(trip, {
    returnTo: returnPath,
    scope: returnScope,
  });
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
        // Keep the status derived from the trip payload; join/cancel report their own errors.
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated, open, trip.id]);

  if (!open) return null;

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  async function handleJoin() {
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
                  Записались: <strong>{confirmedParticipants}</strong>
                  {hasParticipantLimit ? ` из ${trip.capacity}` : " участников"}
                </p>
                {hasParticipantLimit ? (
                  <CapacityIndicator
                    className={styles.capacity}
                    capacity={trip.capacity!}
                    confirmed={confirmedParticipants}
                  />
                ) : null}
                {pendingRequests > 0 ? (
                  <p className={styles.pendingRequests}>{formatPendingRequests(pendingRequests)}</p>
                ) : null}
                <div className={styles.joinActions}>
                  <Button
                    className={styles.joinButton}
                    tone={pendingRequests > 0 ? "primary" : "secondary"}
                    onClick={() => {
                      // The modal already shows the trip URL, so a plain link would only change the hash;
                      // the query makes it a real navigation to the trip page.
                      router.push(`${getTripHref(trip)}?view=participants#participants`);
                    }}
                  >
                    Все участники →
                  </Button>
                  {canCancelTrip ? (
                    <Button
                      className={styles.joinButton}
                      tone="secondary"
                      onClick={() => router.push(editTripHref)}
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
                </div>
              </>
            ) : !canRegisterOnSite(trip) ? (
              <ExternalRegistration trip={trip} />
            ) : (
              <>
                <p className={styles.joinKicker}>
                  {participationStatus || joined
                    ? "Ваша запись"
                    : waitlist
                      ? "Места закончились"
                      : "Можно присоединиться"}
                </p>
                {hasParticipantLimit ? (
                  <CapacityIndicator
                    className={styles.capacity}
                    capacity={trip.capacity!}
                    confirmed={confirmedParticipants}
                  />
                ) : (
                  <p className={styles.participantCount}>
                    Записались: <strong>{confirmedParticipants}</strong> участников
                  </p>
                )}
                {participationStatus || joined ? (
                  <div className={styles.success} role="status">
                    <span aria-hidden="true">✓</span>
                    <h3>
                      {(participationStatus === "waitlisted" || (!participationStatus && waitlist))
                        ? "Вы в листе ожидания"
                        : participationStatus === "pending"
                          ? "Заявка отправлена"
                          : joined
                            ? "Вы успешно записаны!"
                            : "Вы уже записаны"}
                    </h3>
                    <p>
                      {(participationStatus === "waitlisted" || (!participationStatus && waitlist))
                        ? "Сообщим, если освободится место."
                        : participationStatus === "pending"
                          ? "Организатор подтвердит заявку."
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
                        {participationLoading
                          ? "Отменяем…"
                          : participationStatus === "pending"
                            ? "Отозвать заявку"
                            : participationStatus === "waitlisted"
                              ? "Покинуть лист ожидания"
                              : "Отменить запись"}
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <>
                    {participationError ? (
                      <p className={styles.error} role="alert">{participationError}</p>
                    ) : null}
                    {isAuthenticated ? (
                      <Button className={styles.joinButton} size="large" disabled={participationLoading} onClick={handleJoin}>
                        {participationLoading
                          ? "Записываем…"
                          : waitlist
                            ? "Встать в лист ожидания"
                            : "Записаться"}
                      </Button>
                    ) : (
                      <JoinSignInButton className={styles.joinButton} returnTo={getTripHref(trip)}>
                        {waitlist ? "Встать в лист ожидания" : "Записаться"}
                      </JoinSignInButton>
                    )}
                    <p className={styles.joinNote}>{trip.registrationMode === "automatic" ? "Запись подтвердится сразу" : "Организатор подтвердит заявку"}</p>
                    <p className={styles.contactsNote}>
                      Организатор увидит контакты из вашего <Link href="/profile">профиля</Link>: телефон, почту и Telegram.
                    </p>
                  </>
                )}
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
