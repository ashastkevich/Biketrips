import type {
  BikeType,
  CreateParticipantInput,
  CreateTripInput,
  DifficultyLevel,
  DropPolicy,
  ParticipantStatus,
  RegistrationMode,
  SurfaceType,
} from "@biketrips/domain";

export function readString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function readOptionalString(formData: FormData, name: string): string | undefined {
  const value = readString(formData, name);
  return value || undefined;
}

export function readNumber(formData: FormData, name: string): number {
  const value = Number(readString(formData, name));

  if (!Number.isFinite(value)) {
    throw new Error(`Поле ${name} должно быть числом`);
  }

  return value;
}

export function readOptionalNumber(formData: FormData, name: string): number | undefined {
  const rawValue = readOptionalString(formData, name);

  if (!rawValue) return undefined;

  const value = Number(rawValue);

  if (!Number.isFinite(value)) {
    throw new Error(`Поле ${name} должно быть числом`);
  }

  return value;
}

export function readTripInput(formData: FormData): CreateTripInput {
  return {
    title: readString(formData, "title"),
    description: readString(formData, "description"),
    startAt: readString(formData, "startAt"),
    startLocationName: readString(formData, "startLocationName"),
    startLat: readOptionalNumber(formData, "startLat"),
    startLng: readOptionalNumber(formData, "startLng"),
    distanceKm: readNumber(formData, "distanceKm"),
    paceMin: readOptionalNumber(formData, "paceMin"),
    paceMax: readOptionalNumber(formData, "paceMax"),
    difficulty: readString(formData, "difficulty") as DifficultyLevel,
    bikeType: readString(formData, "bikeType") as BikeType,
    surfaceType: readString(formData, "surfaceType") as SurfaceType,
    dropPolicy: readString(formData, "dropPolicy") as DropPolicy,
    routeDescription: readOptionalString(formData, "routeDescription"),
    equipmentRequirements: readOptionalString(formData, "equipmentRequirements"),
    rules: readOptionalString(formData, "rules"),
    maxParticipants: readNumber(formData, "maxParticipants"),
    registrationMode: readString(formData, "registrationMode") as RegistrationMode,
    organizerId: readString(formData, "organizerId"),
    cityId: readString(formData, "cityId"),
  };
}

export function readParticipantInput(formData: FormData): CreateParticipantInput {
  return {
    userId: readString(formData, "userId"),
    name: readString(formData, "name"),
    telegramUsername: readOptionalString(formData, "telegramUsername"),
    phone: readOptionalString(formData, "phone"),
    comment: readOptionalString(formData, "comment"),
  };
}

export function readParticipantStatus(formData: FormData): ParticipantStatus {
  return readString(formData, "status") as ParticipantStatus;
}
