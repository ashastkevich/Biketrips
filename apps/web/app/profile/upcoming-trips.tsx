"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import type { TripDetail } from "@biketrips/domain";

import { ClockIcon, getTripCardProps, PinIcon } from "../lib/components";
import { difficultyLabels, formatShortDate } from "../lib/labels";
import { Badge } from "../ui/components";
import { TripDetailsModal } from "../ui/trip-details-modal";
import { useTripModal } from "../ui/use-trip-modal";

interface UpcomingTripsProps {
  trips: TripDetail[];
  isAuthenticated?: boolean;
  currentUserId?: string;
}

export function UpcomingTrips({
  trips,
  isAuthenticated = false,
  currentUserId,
}: UpcomingTripsProps) {
  const { selectedTrip, openTrip, closeTrip } = useTripModal(trips, "/profile");

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
        {trips.map((trip) => {
          const coverImage = getTripCardProps(trip).coverImage;

          return (
            <Link
              className="profile-trip"
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
                <div>
                  <span><PinIcon /> {trip.city}</span>
                  <span><ClockIcon /> {trip.distanceKm} км</span>
                </div>
              </div>
              <Badge tone={trip.difficulty === "easy" ? "success" : "warning"}>
                {difficultyLabels[trip.difficulty]}
              </Badge>
            </Link>
          );
        })}
      </div>

      {selectedTrip ? (
        <TripDetailsModal
          open
          trip={selectedTrip}
          coverImage={getTripCardProps(selectedTrip).coverImage}
          isAuthenticated={isAuthenticated}
          currentUserId={currentUserId}
          onClose={closeTrip}
        />
      ) : null}
    </>
  );
}
