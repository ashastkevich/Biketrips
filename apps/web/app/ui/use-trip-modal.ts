"use client";

import { useEffect, useState } from "react";
import type { TripDetail } from "@biketrips/domain";

export function useTripModal(trips: TripDetail[], fallbackPath: string) {
  const [selectedTrip, setSelectedTrip] = useState<TripDetail | null>(null);

  useEffect(() => {
    function syncTripWithUrl() {
      const selectedSlug = window.location.pathname.match(/^\/trips\/([^/]+)$/)?.[1];
      setSelectedTrip(trips.find((trip) => trip.slug === selectedSlug) ?? null);
    }

    window.addEventListener("popstate", syncTripWithUrl);
    return () => window.removeEventListener("popstate", syncTripWithUrl);
  }, [trips]);

  function openTrip(trip: TripDetail) {
    window.history.pushState({ tripModal: true }, "", `/trips/${trip.slug}`);
    setSelectedTrip(trip);
  }

  function closeTrip() {
    if (window.history.state?.tripModal) {
      window.history.back();
      return;
    }

    window.history.replaceState(null, "", fallbackPath);
    setSelectedTrip(null);
  }

  return { selectedTrip, openTrip, closeTrip };
}
