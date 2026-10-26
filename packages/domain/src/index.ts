export const tripStatuses = [
  "draft",
  "pending_review",
  "changes_requested",
  "rejected",
  "published",
  "cancelled",
  "finished",
] as const;
export type TripStatus = (typeof tripStatuses)[number];

export const tripModerationStatuses = [
  "draft",
  "pending_review",
  "changes_requested",
  "approved",
  "rejected",
] as const;
export type TripModerationStatus = (typeof tripModerationStatuses)[number];

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
  email?: string;
  emailVerified?: boolean;
  telegram?: string;
  telegramVerified?: boolean;
}

export function canJoinTrips(user: AuthenticatedUser | null): boolean {
  return user !== null;
}

export function canCreateTrips(user: AuthenticatedUser | null): boolean {
  return user?.role === "admin" || user?.telegramVerified === true;
}

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

export const registrationModes = ["automatic", "manual"] as const;
export type RegistrationMode = (typeof registrationModes)[number];

/** Where a trip came from: created on the site or imported from a Telegram channel post. */
export const tripSources = ["native", "telegram_import"] as const;
export type TripSource = (typeof tripSources)[number];

/** Imported trips send riders to the organizer's own sign-up instead of the site. */
export function canRegisterOnSite(trip: Pick<TripSummary, "source">): boolean {
  return trip.source === "native";
}

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
  organizerId: string;
  startDateTime: string;
  startLocationName: string;
  /** Null only for imported trips whose post did not state it ("Не указано"). */
  distanceKm: number | null;
  difficulty: DifficultyLevel | null;
  pace: PaceType;
  asphaltPercent: number | null;
  unpavedPercent: number | null;
  unpavedSurfaceDetails: UnpavedSurfaceDetail[];
  source: TripSource;
  /** The Telegram post an imported trip was created from. */
  sourceUrl: string | null;
  /** Where riders sign up for an imported trip (organizer chat, contact or the post). */
  externalRegistrationUrl: string | null;
  status: TripStatus;
  moderationStatus: TripModerationStatus;
  moderationComment: string | null;
  hasPendingRevision: boolean;
  capacity: number | null;
  confirmedParticipants: number;
  coverImage: string | null;
}

export interface TripParticipant {
  id: string;
  status: ParticipantStatus;
  userId: string;
  name: string;
  /**
   * Contacts come from the participant's profile and are present only for the trip
   * organizer, admins and the participant themselves.
   */
  telegramUsername?: string | null;
  phone?: string | null;
  email?: string | null;
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
  /**
   * "channel" is the Telegram channel imported trips came from; contactUrl links to it.
   * "club" is a club an imported post names as the organizer.
   */
  kind: "person" | "channel" | "club";
  contactUrl: string | null;
}

export const organizerBioMaxLength = 500;

/**
 * The organizer page anyone can open, signed in or not. It deliberately carries no
 * contacts: riders reach the organizer by joining one of the trips.
 */
export interface OrganizerProfile {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  city: string | null;
  bio: string | null;
  isVerified: boolean;
  /**
   * Created by the importer from a post's Telegram username; its owner takes it over
   * by signing in with that Telegram account.
   */
  isClaimable: boolean;
  organizingSince: string;
  completedTripsCount: number;
  upcomingTrips: TripSummary[];
  /** The latest completed trips; their pages are not public, so they are listed without links. */
  pastTrips: TripSummary[];
}

export interface UpdateOrganizerProfileInput {
  bio: string;
}

export interface TripDetail extends TripSummary {
  description: string;
  /**
   * Who leads an imported ride, as named in the post; null when the post does not say.
   * The trip's own organizer stays the channel it was imported from.
   */
  importedOrganizer: TripOrganizer | null;
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
  asphaltPercent: number;
  unpavedPercent: number;
  unpavedSurfaceDetails?: UnpavedSurfaceDetail[];
  routeDescription?: string;
  equipmentRequirements?: string;
  rules?: string;
  maxParticipants?: number | null;
  registrationMode?: RegistrationMode;
  coverImage?: string;
  organizerId: string;
  cityId: string;
}

/** Imported trips may keep distance, difficulty and surface empty ("Не указано"). */
export type UpdateTripInput = Omit<
  CreateTripInput,
  "organizerId" | "distanceKm" | "difficulty" | "asphaltPercent" | "unpavedPercent"
> & {
  distanceKm: number | null;
  difficulty: DifficultyLevel | null;
  asphaltPercent: number | null;
  unpavedPercent: number | null;
};

export interface TripFilters {
  city?: string;
  difficulty?: DifficultyLevel;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateParticipantInput {
  comment?: string;
}

export function hasAvailablePlaces(
  trip: Pick<TripSummary, "capacity" | "confirmedParticipants">
): boolean {
  return trip.capacity === null || trip.confirmedParticipants < trip.capacity;
}

export const importedPostStatuses = ["imported", "skipped", "error"] as const;
export type ImportedPostStatus = (typeof importedPostStatuses)[number];

/** A Telegram post the importer has seen, for the admin import log. */
export interface ImportedPostSummary {
  id: string;
  messageId: number;
  url: string;
  postedAt: string;
  excerpt: string;
  kind: string | null;
  status: ImportedPostStatus;
  skipReason: string | null;
  tripId: string | null;
  tripSlug: string | null;
  tripTitle: string | null;
  extractedAt: string | null;
}

export interface ImportSourceSummary {
  id: string;
  handle: string;
  title: string;
  city: string;
  enabled: boolean;
  lastRunAt: string | null;
  lastError: string | null;
  recentPosts: ImportedPostSummary[];
}

export interface ImportRunResult {
  created: number;
  updated: number;
  cancelled: number;
  skipped: number;
  unchanged: number;
  errors: number;
}
