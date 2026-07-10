"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import type { TripDetail } from "@biketrips/domain";

import { ClockIcon, getTripCardProps, PinIcon } from "../lib/components";
import { difficultyLabels, formatShortDate, tripStatusLabels } from "../lib/labels";
import { Badge } from "../ui/components";
import { TripDetailsModal } from "../ui/trip-details-modal";
import { useTripModal } from "../ui/use-trip-modal";

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
      <div className="profile-trip-list">
        {trips.length === 0 ? (
          <p className="profile-trip-list__empty">{emptyMessage}</p>
        ) : (
          <>
            {variant === "created" ? (
              <div className="profile-trip-table__header" aria-hidden="true">
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
              className={`profile-trip${variant === "created" ? " profile-trip--created" : ""}`}
              href={`/trips/${trip.slug}`}
              key={trip.id}
              onClick={(event) => handleTripClick(event, trip)}
            >
              <div
                className="profile-trip__cover"
                style={{ backgroundImage: `url("${coverImage}")` }}
                aria-hidden="true"
              />
              <div className="profile-trip__copy">
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
                  <span className="profile-trip__city" data-label="Город">{trip.city}</span>
                  <span className="profile-trip__capacity" data-label="Места">
                    {trip.capacity === null
                      ? "Без лимита"
                      : `${trip.confirmedParticipants}/${trip.capacity}`}
                  </span>
                  <Badge tone={trip.status === "published" ? "success" : trip.status === "cancelled" ? "danger" : "neutral"}>
                    {tripStatusLabels[trip.status]}
                  </Badge>
                </>
              ) : (
                <Badge tone={trip.difficulty === "easy" ? "success" : "warning"}>
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
