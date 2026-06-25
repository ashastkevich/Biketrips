export const tripStatuses = ["draft", "published", "cancelled", "finished"] as const;
export type TripStatus = (typeof tripStatuses)[number];

export const participantStatuses = ["pending", "confirmed", "waitlisted", "cancelled"] as const;
export type ParticipantStatus = (typeof participantStatuses)[number];

export const difficultyLevels = ["beginner", "easy", "medium", "hard", "sport"] as const;
export type DifficultyLevel = (typeof difficultyLevels)[number];

export const paceTypes = ["relaxed", "steady", "fast", "training"] as const;
export type PaceType = (typeof paceTypes)[number];

export const bikeTypes = ["city", "road", "gravel", "mtb", "hybrid", "any"] as const;
export type BikeType = (typeof bikeTypes)[number];

export const surfaceTypes = ["asphalt", "gravel", "dirt", "park_paths", "mixed"] as const;
export type SurfaceType = (typeof surfaceTypes)[number];

export const dropPolicies = ["no_drop", "drop"] as const;
export type DropPolicy = (typeof dropPolicies)[number];

export const tripFormats = ["no_drop", "drop", "training", "social", "family"] as const;
export type TripFormat = (typeof tripFormats)[number];

export const registrationModes = ["automatic", "manual"] as const;
export type RegistrationMode = (typeof registrationModes)[number];

export interface TripSummary {
  id: string;
  slug: string;
  title: string;
  city: string;
  startDateTime: string;
  distanceKm: number;
  difficulty: DifficultyLevel;
  pace: PaceType;
  bikeType: BikeType;
  surfaceType: SurfaceType;
  dropPolicy: DropPolicy;
  status: TripStatus;
  capacity: number;
  confirmedParticipants: number;
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
  surfaceType: SurfaceType;
  dropPolicy: DropPolicy;
  routeDescription?: string;
  equipmentRequirements?: string;
  rules?: string;
  maxParticipants: number;
  registrationMode?: RegistrationMode;
  organizerId: string;
  cityId: string;
}

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
  return trip.confirmedParticipants < trip.capacity;
}
