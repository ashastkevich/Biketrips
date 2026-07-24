export const tripStatuses = ["draft", "published", "cancelled", "finished"] as const;
export type TripStatus = (typeof tripStatuses)[number];

export const participantStatuses = ["pending", "confirmed", "waitlisted", "cancelled"] as const;
export type ParticipantStatus = (typeof participantStatuses)[number];

export const difficultyLevels = ["beginner", "easy", "medium", "hard", "sport"] as const;
export type DifficultyLevel = (typeof difficultyLevels)[number];

export const paceTypes = ["relaxed", "steady", "fast", "training"] as const;
export type PaceType = (typeof paceTypes)[number];

export const userRoles = ["user", "admin"] as const;
export type UserRole = (typeof userRoles)[number];

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  phone?: string;
  phoneVerified: boolean;
}

export function canJoinTrips(user: AuthenticatedUser | null): boolean {
  return user !== null;
}

export function canCreateTrips(user: AuthenticatedUser | null): boolean {
  return user?.role === "admin" ||
    user?.phoneVerified === true ||
    Boolean(user?.phone?.trim());
}

export const bikeTypes = ["city", "road", "gravel", "mtb", "hybrid", "any"] as const;
export type BikeType = (typeof bikeTypes)[number];

export const unpavedSurfaceDetails = [
  "hardpack",
  "gravel",
  "crushed_stone",
  "sand",
  "forest_trails",
  "mud",
  "concrete_slabs",
] as const;
export type UnpavedSurfaceDetail = (typeof unpavedSurfaceDetails)[number];

export const dropPolicies = ["no_drop", "drop"] as const;
export type DropPolicy = (typeof dropPolicies)[number];

export const tripFormats = ["no_drop", "drop", "training", "social", "family"] as const;
export type TripFormat = (typeof tripFormats)[number];

export const registrationModes = ["automatic", "manual"] as const;
export type RegistrationMode = (typeof registrationModes)[number];

const cyrillicTransliteration: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

export function slugifyTripTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/№/g, "")
    .split("")
    .map((character) => cyrillicTransliteration[character] ?? character)
    .join("")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72)
    .replace(/-+$/g, "");
}

export interface City {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  centerLat: number | null;
  centerLng: number | null;
}

export interface TripSummary {
  id: string;
  slug: string;
  title: string;
  cityId: string;
  city: string;
  startDateTime: string;
  distanceKm: number;
  difficulty: DifficultyLevel;
  pace: PaceType;
  bikeType: BikeType;
  asphaltPercent: number;
  unpavedPercent: number;
  unpavedSurfaceDetails: UnpavedSurfaceDetail[];
  dropPolicy: DropPolicy;
  status: TripStatus;
  capacity: number | null;
  confirmedParticipants: number;
  coverImage: string | null;
}

export interface TripParticipant {
  id: string;
  status: ParticipantStatus;
  userId: string;
  name: string;
  telegramUsername: string | null;
  phone: string | null;
}

export interface TripWaitlistEntry {
  id: string;
  position: number;
  userId: string;
  name?: string;
  promotedAt: string | null;
}

export interface TripUpdate {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface TripOrganizer {
  id: string;
  userId: string;
  displayName: string;
  isVerified: boolean;
}

export interface TripDetail extends TripSummary {
  description: string;
  startLocationName: string;
  startLat: number | null;
  startLng: number | null;
  paceMin: number | null;
  paceMax: number | null;
  routeDescription: string | null;
  equipmentRequirements: string | null;
  rules: string | null;
  routeGpxFileName: string | null;
  routeGpxDownloadUrl: string | null;
  registrationMode: RegistrationMode;
  organizer: TripOrganizer;
  participants: TripParticipant[];
  waitlist: TripWaitlistEntry[];
  updates: TripUpdate[];
}

export interface CreateTripInput {
  title: string;
  description: string;
  startAt: string;
  startLocationName: string;
  startLat?: number;
  startLng?: number;
  distanceKm: number;
  paceMin?: number;
  paceMax?: number;
  difficulty: DifficultyLevel;
  bikeType: BikeType;
  asphaltPercent: number;
  unpavedPercent: number;
  unpavedSurfaceDetails?: UnpavedSurfaceDetail[];
  dropPolicy: DropPolicy;
  routeDescription?: string;
  equipmentRequirements?: string;
  rules?: string;
  maxParticipants?: number | null;
  registrationMode?: RegistrationMode;
  coverImage?: string;
  organizerId: string;
  cityId: string;
}

export type UpdateTripInput = Omit<CreateTripInput, "organizerId">;

export interface TripFilters {
  city?: string;
  difficulty?: DifficultyLevel;
  bikeType?: BikeType;
  dateFrom?: string;
  dateTo?: string;
  includeDrafts?: boolean;
}

export interface CreateParticipantInput {
  userId: string;
  name: string;
  telegramUsername?: string;
  phone?: string;
  comment?: string;
}

export function hasAvailablePlaces(
  trip: Pick<TripSummary, "capacity" | "confirmedParticipants">
): boolean {
  return trip.capacity === null || trip.confirmedParticipants < trip.capacity;
}
