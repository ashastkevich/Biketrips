"use client";

import { useEffect, useState } from "react";
import type { TripDetail } from "@biketrips/domain";

function decodePathSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function useTripModal(
  trips: TripDetail[],
  fallbackPath: string,
  modalScope: string,
) {
  const [selectedTrip, setSelectedTrip] = useState<TripDetail | null>(null);
  const [savedChanges, setSavedChanges] = useState<string[] | null>(null);

  useEffect(() => {
    function syncTripWithUrl() {
      const query = new URLSearchParams(window.location.search);
      const queryTrip = query.get("trip");
      const requestedSlug =
        query.get("scope") === modalScope ? queryTrip : null;
      const pathSlug = window.location.pathname.match(/^\/trips\/([^/]+)$/)?.[1];
      const selectedSlug = queryTrip
        ? requestedSlug
        : pathSlug
          ? decodePathSegment(pathSlug)
          : null;
      const trip = trips.find((item) => item.slug === selectedSlug) ?? null;

      setSelectedTrip(trip);
      if (requestedSlug && trip) {
        setSavedChanges(query.get("saved") === "1" ? query.getAll("change") : null);
      }
    }

    syncTripWithUrl();
    window.addEventListener("popstate", syncTripWithUrl);
    return () => window.removeEventListener("popstate", syncTripWithUrl);
  }, [modalScope, trips]);

  function openTrip(trip: TripDetail) {
    window.history.pushState({ tripModal: true }, "", `/trips/${trip.slug}`);
    setSavedChanges(null);
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

  function acknowledgeSavedChanges() {
    setSavedChanges(null);
    if (selectedTrip) {
      window.history.replaceState(
        { restoredTripModal: true },
        "",
        `/trips/${encodeURIComponent(selectedTrip.slug)}`,
      );
    }
  }

  return {
    selectedTrip,
    savedChanges,
    openTrip,
    closeTrip,
    acknowledgeSavedChanges,
  };
}
