import { BikeTripsApiClient } from "@biketrips/api-client";
import { cookies } from "next/headers";
import type {
  CreateParticipantInput,
  CreateTripInput,
  ParticipantStatus,
  TripDetail,
  TripFilters,
  TripParticipant,
  TripSummary,
} from "@biketrips/domain";

import { demoTrips, toTripSummary } from "./demo-data";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const organizerToken = process.env.BIKETRIPS_ORGANIZER_TOKEN;
const authCookieName = "biketrips_session";

async function getAuthToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(authCookieName)?.value ?? organizerToken;
}

async function createClient(): Promise<BikeTripsApiClient> {
  return new BikeTripsApiClient({
    baseUrl: apiUrl,
    authToken: await getAuthToken(),
    fetcher: (input, init) => fetch(input, { ...init, cache: "no-store" }),
  });
}

function matchesFilters(trip: TripSummary, filters: TripFilters): boolean {
  if (!filters.includeDrafts && trip.status !== "published") return false;
  if (filters.city && !trip.city.toLowerCase().includes(filters.city.toLowerCase())) return false;
  if (filters.difficulty && trip.difficulty !== filters.difficulty) return false;
  if (filters.bikeType && trip.bikeType !== filters.bikeType) return false;
  if (filters.dateFrom && trip.startDateTime < filters.dateFrom) return false;
  if (filters.dateTo && trip.startDateTime > filters.dateTo) return false;

  return true;
}

export interface DataResult<TData> {
  data: TData;
  source: "api" | "demo";
  error?: string;
}

export async function getTrips(filters: TripFilters = {}): Promise<DataResult<TripSummary[]>> {
  try {
    const client = await createClient();
    const trips = await client.listTrips(filters);
    return { data: trips, source: "api" };
  } catch (error) {
    const summaries = demoTrips.map(toTripSummary).filter((trip) => matchesFilters(trip, filters));
    return { data: summaries, source: "demo", error: getErrorMessage(error) };
  }
}

export async function getTrip(slugOrId: string): Promise<DataResult<TripDetail | null>> {
  try {
    const client = await createClient();
    const trip = await client.getTrip(slugOrId);
    return { data: trip, source: "api" };
  } catch (error) {
    const trip = demoTrips.find((item) => item.slug === slugOrId || item.id === slugOrId) ?? null;
    return { data: trip, source: "demo", error: getErrorMessage(error) };
  }
}

export async function createTrip(input: CreateTripInput): Promise<TripDetail> {
  const client = await createClient();
  return client.createTrip(input);
}

export async function joinTrip(
  tripId: string,
  input: CreateParticipantInput
): Promise<TripParticipant> {
  const client = await createClient();
  return client.joinTrip(tripId, input);
}

export async function updateTripStatus(
  tripId: string,
  action: "publish" | "cancel" | "finish"
): Promise<TripDetail> {
  const client = await createClient();

  if (action === "publish") return client.publishTrip(tripId);
  if (action === "cancel") return client.cancelTrip(tripId);

  return client.finishTrip(tripId);
}

export async function updateParticipantStatus(
  tripId: string,
  participantId: string,
  status: ParticipantStatus
): Promise<TripParticipant> {
  const client = await createClient();
  return client.updateParticipantStatus(tripId, participantId, status);
}

export async function getOrganizerAuthState(): Promise<"configured" | "missing"> {
  const token = await getAuthToken();

  if (!token) return "missing";

  const response = await fetch(`${apiUrl}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  }).catch(() => null);

  return response?.ok ? "configured" : "missing";
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown API error";
}
