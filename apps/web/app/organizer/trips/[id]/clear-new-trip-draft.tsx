"use client";

import { useEffect } from "react";

import { NEW_TRIP_DRAFT_KEY } from "../../../trips/new/draft-storage";

interface ClearNewTripDraftProps {
  enabled: boolean;
}

export function ClearNewTripDraft({ enabled }: ClearNewTripDraftProps) {
  useEffect(() => {
    if (!enabled) return;

    window.localStorage.removeItem(NEW_TRIP_DRAFT_KEY);
  }, [enabled]);

  return null;
}
