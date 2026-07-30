"use client";

import Link from "next/link";
import Image from "next/image";
import type { MouseEvent } from "react";
import type { TripDetail } from "@biketrips/domain";

import { ClockIcon, getTripCardProps, PinIcon } from "../lib/components";
import { getTripHref } from "../lib/trip-links";
import { difficultyLabels, formatShortDate, tripStatusLabels } from "../lib/labels";
import { Badge } from "../ui/components";
import { TripDetailsModal } from "../ui/trip-details-modal";
import { useTripModal } from "../ui/use-trip-modal";
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
}

export function UpcomingTrips({
  trips,
  isAuthenticated = false,
  currentUserId,
  emptyMessage = "Поездок пока нет.",
  variant = "upcoming",
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

          return (
            <Link
              className={classes(styles.trip, variant === "created" && styles.tripCreated)}
              href={getTripHref(trip)}
              key={trip.id}
              onClick={(event) => handleTripClick(event, trip)}
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
              {variant === "created" ? (
                <>
                  <span className={styles.tripCity} data-label="Город">{trip.city}</span>
                  <span className={styles.tripCapacity} data-label="Места">
                    {trip.capacity === null
                      ? "Без лимита"
                      : `${trip.confirmedParticipants}/${trip.capacity}`}
                  </span>
                  <Badge className={styles.tripBadge} tone={trip.status === "published" ? "success" : trip.status === "cancelled" ? "danger" : "neutral"}>
                    {tripStatusLabels[trip.status]}
                  </Badge>
                </>
              ) : (
                <Badge className={styles.tripBadge} tone={trip.difficulty === "easy" ? "success" : "warning"}>
                  {difficultyLabels[trip.difficulty]}
                </Badge>
              )}
            </Link>
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
