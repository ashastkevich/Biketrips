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
  bikeTypes: BikeType[];
  surfaceTypes: SurfaceType[];
  format: TripFormat;
  status: TripStatus;
  capacity: number;
  confirmedParticipants: number;
}

export function hasAvailablePlaces(
  trip: Pick<TripSummary, "capacity" | "confirmedParticipants">
): boolean {
  return trip.confirmedParticipants < trip.capacity;
}
