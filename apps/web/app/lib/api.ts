import { BikeTripsApiClient } from "@biketrips/api-client";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type {
  AuthenticatedUser,
  City,
  CreateParticipantInput,
  CreateTripInput,
  ParticipantStatus,
  TripDetail,
  TripFilters,
  TripParticipant,
  TripSummary,
  UpdateTripInput,
} from "@biketrips/domain";

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

export interface DataResult<TData> {
  data: TData;
  source: "api" | "unavailable";
  error?: string;
}

export interface CurrentUser extends AuthenticatedUser {
  name: string;
  phone: string;
  telegram: string;
  email: string;
  telegramVerified: boolean;
  emailVerified: boolean;
  cityId: string;
  city: string;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = await getAuthToken();

  if (!token) return null;

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET ?? "local-development-secret",
    );

    if (
      typeof payload === "string" ||
      typeof payload.sub !== "string" ||
      (payload.role !== "user" && payload.role !== "admin")
    ) {
      return null;
    }

    const sessionUser: CurrentUser = {
      id: payload.sub,
      name: typeof payload.name === "string" ? payload.name : "Пользователь",
      role: payload.role,
      phoneVerified: payload.phoneVerified === true,
      phone: typeof payload.phone === "string" ? payload.phone : "",
      telegram: typeof payload.telegram === "string" ? payload.telegram : "",
      email: typeof payload.email === "string" ? payload.email : "",
      telegramVerified: payload.telegramVerified === true,
      emailVerified: payload.emailVerified === true,
      cityId: typeof payload.cityId === "string" ? payload.cityId : "",
      city: typeof payload.city === "string" ? payload.city : "",
    };

    const databaseResponse = await fetch(`${apiUrl}/users/${encodeURIComponent(payload.sub)}`, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    }).catch(() => null);

    if (!databaseResponse?.ok) return sessionUser;

    const databaseUser = await databaseResponse.json() as {
      name: string;
      email: string | null;
      emailVerifiedAt: string | null;
      phoneNumber: string | null;
      phoneVerifiedAt: string | null;
      cityId: string | null;
      city: { name: string } | null;
      telegramAccounts?: Array<{ username: string | null }>;
    };
    const verifiedTelegram = databaseUser.telegramAccounts?.find((account) => account.username)?.username ?? "";
    return {
      ...sessionUser,
      name: databaseUser.name,
      email: databaseUser.email ?? "",
      emailVerified: databaseUser.emailVerifiedAt !== null,
      phone: databaseUser.phoneNumber ?? "",
      phoneVerified: databaseUser.phoneVerifiedAt !== null,
      telegram: verifiedTelegram || sessionUser.telegram,
      telegramVerified: Boolean(verifiedTelegram) || sessionUser.telegramVerified,
      cityId: databaseUser.cityId ?? "",
      city: databaseUser.city?.name ?? "",
    };
  } catch {
    return null;
  }
}

export async function getTrips(filters: TripFilters = {}): Promise<DataResult<TripSummary[]>> {
  try {
    const client = await createClient();
    const trips = await client.listTrips(filters);
    return { data: trips, source: "api" };
  } catch (error) {
    return { data: [], source: "unavailable", error: getErrorMessage(error) };
  }
}

export async function getCities(): Promise<DataResult<City[]>> {
  try {
    const client = await createClient();
    const cities = await client.listCities();
    return { data: cities, source: "api" };
  } catch (error) {
    return { data: [], source: "unavailable", error: getErrorMessage(error) };
  }
}

export async function getTrip(slugOrId: string): Promise<DataResult<TripDetail | null>> {
  try {
    const client = await createClient();
    const trip = await client.getTrip(slugOrId);
    return { data: trip, source: "api" };
  } catch (error) {
    return { data: null, source: "unavailable", error: getErrorMessage(error) };
  }
}

export async function getTripDetails(filters: TripFilters = {}): Promise<DataResult<TripDetail[]>> {
  const summaries = await getTrips(filters);
  if (summaries.source === "unavailable") {
    return { data: [], source: "unavailable", error: summaries.error };
  }

  const details = await Promise.all(
    summaries.data.map((trip) => getTrip(trip.id)),
  );
  return {
    data: details.flatMap((result) => result.data ? [result.data] : []),
    source: "api",
  };
}

export async function createTrip(input: CreateTripInput): Promise<TripDetail> {
  const client = await createClient();
  return client.createTrip(input);
}

export async function createTripWithRouteFile(
  input: CreateTripInput,
  routeFile: File | undefined,
  coverImageFile?: File,
): Promise<TripDetail> {
  const client = await createClient();
  return client.createTripWithRouteFile(input, routeFile, coverImageFile);
}

export async function updateTrip(tripId: string, input: UpdateTripInput): Promise<TripDetail> {
  const client = await createClient();
  return client.updateTrip(tripId, input);
}

export async function updateTripWithRouteFile(
  tripId: string,
  input: UpdateTripInput,
  options: { routeFile?: File; coverImageFile?: File; removeRouteFile?: boolean },
): Promise<TripDetail> {
  const client = await createClient();
  return client.updateTripWithRouteFile(tripId, input, options);
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

export async function getOrganizerAuthState(): Promise<"allowed" | "phone-required" | "missing"> {
  const token = await getAuthToken();

  if (!token) return "missing";

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET ?? "local-development-secret",
    );

    if (typeof payload === "string" || !payload.sub) return "missing";

    return payload.role === "admin" ||
      payload.phoneVerified === true ||
      (typeof payload.phone === "string" && payload.phone.trim().length > 0)
      ? "allowed"
      : "phone-required";
  } catch {
    return "missing";
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown API error";
}
