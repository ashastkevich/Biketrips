export interface TripReference {
  id?: string | null;
  slug?: string | null;
}

export function getTripReference(trip: TripReference): string | null {
  return trip.slug?.trim() || trip.id?.trim() || null;
}

export function getTripHref(trip: TripReference): string {
  const reference = getTripReference(trip);

  return reference ? `/trips/${encodeURIComponent(reference)}` : "/trips";
}

export function getTripEditHref(
  trip: TripReference,
  {
    returnTo = "/profile",
    scope = "created",
  }: {
    returnTo?: "/" | "/profile";
    scope?: "feed" | "created" | "participating";
  } = {},
): string {
  return `${getTripHref(trip)}/edit?returnTo=${encodeURIComponent(returnTo)}&scope=${encodeURIComponent(scope)}`;
}

export function isSameTripReference(trip: TripReference, reference: string | null): boolean {
  if (!reference) return false;

  return trip.slug === reference || trip.id === reference;
}
