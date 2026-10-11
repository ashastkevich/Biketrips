"use client";

import Link from "next/link";
import Image from "next/image";
import type { MouseEvent } from "react";
import { useFormStatus } from "react-dom";
import type { TripDetail } from "@biketrips/domain";

import { ClockIcon, getTripCardProps, PinIcon } from "../lib/components";
import { getTripEditHref, getTripHref } from "../lib/trip-links";
import { difficultyLabels, formatShortDate } from "../lib/labels";
import { formatPendingRequests } from "../lib/participant-groups";
import { Badge, Button, LinkButton } from "../ui/components";
import { TripDetailsModal } from "../ui/trip-details-modal";
import { preloadTripHeroImage } from "../ui/trip-hero-image";
import { useTripModal } from "../ui/use-trip-modal";
import { getOrganizerTripState, type OrganizerTripState } from "./organizer-trip-state";
import styles from "./profile.module.css";

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

interface UpcomingTripsProps {
  trips: TripDetail[];
  isAuthenticated?: boolean;
  currentUserId?: string;
  emptyMessage?: string;
  variant?: "upcoming" | "created";
  /** Server time used to evaluate organizer actions, so the client render matches the server. */
  now?: number;
  submitAction?: (formData: FormData) => Promise<void>;
  withdrawAction?: (formData: FormData) => Promise<void>;
}

function PendingSubmitButton({ children, tone }: { children: string; tone: "primary" | "secondary" }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="small" tone={tone} loading={pending}>
      {children}
    </Button>
  );
}

const panelToneClasses: Partial<Record<OrganizerTripState["tone"], string | undefined>> = {
  warning: styles.tripPanelWarning,
  danger: styles.tripPanelDanger,
  info: styles.tripPanelInfo,
};

function OrganizerTripPanel({
  trip,
  state,
  submitAction,
  withdrawAction,
}: {
  trip: TripDetail;
  state: OrganizerTripState;
  submitAction?: (formData: FormData) => Promise<void>;
  withdrawAction?: (formData: FormData) => Promise<void>;
}) {
  if (!state.message) return null;
  const canSubmit = state.canSubmit && submitAction;
  const canWithdraw = state.canWithdraw && withdrawAction;

  return (
    <div className={classes(styles.tripPanel, panelToneClasses[state.tone])}>
      <div className={styles.tripPanelCopy}>
        <p>{state.message}</p>
        {state.comment ? <blockquote>{state.comment}</blockquote> : null}
      </div>
      {state.canEdit || canSubmit || canWithdraw ? (
        <div className={styles.tripPanelActions}>
          {state.canEdit ? (
            <LinkButton href={getTripEditHref(trip)} size="small" tone="secondary">
              Редактировать
            </LinkButton>
          ) : null}
          {canSubmit ? (
            <form action={submitAction}>
              <input name="tripId" type="hidden" value={trip.id} />
              <PendingSubmitButton tone="primary">Отправить на модерацию</PendingSubmitButton>
            </form>
          ) : null}
          {canWithdraw ? (
            <form action={withdrawAction}>
              <input name="tripId" type="hidden" value={trip.id} />
              <PendingSubmitButton tone="secondary">Отозвать заявку</PendingSubmitButton>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function PendingRequestsPanel({ trip, count }: { trip: TripDetail; count: number }) {
  return (
    <div className={classes(styles.tripPanel, styles.tripPanelWarning)}>
      <div className={styles.tripPanelCopy}>
        <p>{formatPendingRequests(count)}</p>
      </div>
      <div className={styles.tripPanelActions}>
        <LinkButton href={`${getTripHref(trip)}#participants`} size="small" tone="primary">
          Открыть участников
        </LinkButton>
      </div>
    </div>
  );
}

export function UpcomingTrips({
  trips,
  isAuthenticated = false,
  currentUserId,
  emptyMessage = "Поездок пока нет.",
  variant = "upcoming",
  now,
  submitAction,
  withdrawAction,
}: UpcomingTripsProps) {
  const modalScope = variant === "created" ? "created" : "participating";
  const {
    selectedTrip,
    savedChanges,
    openTrip,
    closeTrip,
    acknowledgeSavedChanges,
  } = useTripModal(trips, "/profile", modalScope);

  function handleTripClick(event: MouseEvent<HTMLAnchorElement>, trip: TripDetail) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    openTrip(trip);
  }

  return (
    <>
      <div className={styles.tripList}>
        {trips.length === 0 ? (
          <p className={styles.tripListEmpty}>{emptyMessage}</p>
        ) : (
          <>
            {variant === "created" ? (
              <div className={styles.tripTableHeader} aria-hidden="true">
                <span>Поездка</span>
                <span>Город</span>
                <span>Места</span>
                <span>Статус</span>
              </div>
            ) : null}
            {trips.map((trip) => {
          const coverImage = getTripCardProps(trip).coverImage;
          const organizerState =
            variant === "created" ? getOrganizerTripState(trip, now ?? Date.now()) : null;

          return (
            <article className={styles.tripItem} key={trip.id}>
              <Link
                className={classes(styles.trip, variant === "created" && styles.tripCreated)}
                href={getTripHref(trip)}
                onClick={(event) => handleTripClick(event, trip)}
                onPointerEnter={() => preloadTripHeroImage(coverImage)}
                onPointerDown={() => preloadTripHeroImage(coverImage)}
                onFocus={() => preloadTripHeroImage(coverImage)}
              >
                <div
                  className={classes(styles.tripCover, !coverImage && styles.tripCoverFallback)}
                  aria-hidden="true"
                >
                  {coverImage ? (
                    <Image
                      className={styles.tripCoverImage}
                      src={coverImage}
                      alt=""
                      fill
                      sizes="88px"
                    />
                  ) : null}
                </div>
                <div className={styles.tripCopy}>
                  <p>{formatShortDate(trip.startDateTime)}</p>
                  <h3>{trip.title}</h3>
                  {variant === "upcoming" ? (
                    <div>
                      <span><PinIcon /> {trip.city}</span>
                      <span><ClockIcon /> {trip.distanceKm} км</span>
                    </div>
                  ) : null}
                </div>
                {organizerState ? (
                  <>
                    <span className={styles.tripCity} data-label="Город">{trip.city}</span>
                    <span className={styles.tripCapacity} data-label="Места">
                      {trip.capacity === null
                        ? "Без лимита"
                        : `${trip.confirmedParticipants}/${trip.capacity}`}
                    </span>
                    <Badge className={styles.tripBadge} tone={organizerState.tone}>
                      {organizerState.label}
                    </Badge>
                  </>
                ) : (
                  <Badge className={styles.tripBadge} tone={trip.difficulty === "easy" ? "success" : "warning"}>
                    {difficultyLabels[trip.difficulty]}
                  </Badge>
                )}
              </Link>
              {organizerState ? (
                <OrganizerTripPanel
                  trip={trip}
                  state={organizerState}
                  submitAction={submitAction}
                  withdrawAction={withdrawAction}
                />
              ) : null}
              {organizerState && organizerState.pendingRequests > 0 ? (
                <PendingRequestsPanel trip={trip} count={organizerState.pendingRequests} />
              ) : null}
            </article>
          );
            })}
          </>
        )}
      </div>

      {selectedTrip ? (
        <TripDetailsModal
          open
          trip={selectedTrip}
          coverImage={getTripCardProps(selectedTrip).coverImage}
          isAuthenticated={isAuthenticated}
          currentUserId={currentUserId}
          onClose={closeTrip}
          returnPath="/profile"
          returnScope={modalScope}
          savedChanges={savedChanges}
          onSavedConfirmationClose={acknowledgeSavedChanges}
        />
      ) : null}
    </>
  );
}
