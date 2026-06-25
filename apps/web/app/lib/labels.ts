import type {
  BikeType,
  DifficultyLevel,
  DropPolicy,
  ParticipantStatus,
  PaceType,
  RegistrationMode,
  SurfaceType,
  TripStatus,
} from "@biketrips/domain";

export const difficultyLabels: Record<DifficultyLevel, string> = {
  beginner: "Новичкам",
  easy: "Легко",
  medium: "Средне",
  hard: "Сложно",
  sport: "Спорт",
};

export const paceLabels: Record<PaceType, string> = {
  relaxed: "Спокойно",
  steady: "Ровно",
  fast: "Быстро",
  training: "Тренировка",
};

export const bikeTypeLabels: Record<BikeType, string> = {
  city: "Городской",
  road: "Шоссе",
  gravel: "Gravel",
  mtb: "MTB",
  hybrid: "Гибрид",
  any: "Любой",
};

export const surfaceLabels: Record<SurfaceType, string> = {
  asphalt: "Асфальт",
  gravel: "Грейдер",
  dirt: "Грунт",
  park_paths: "Парки",
  mixed: "Смешанное",
};

export const dropPolicyLabels: Record<DropPolicy, string> = {
  no_drop: "No-drop",
  drop: "Drop",
};

export const tripStatusLabels: Record<TripStatus, string> = {
  draft: "Черновик",
  published: "Опубликована",
  cancelled: "Отменена",
  finished: "Завершена",
};

export const participantStatusLabels: Record<ParticipantStatus, string> = {
  pending: "На модерации",
  confirmed: "Едет",
  waitlisted: "Лист ожидания",
  cancelled: "Отменен",
};

export const registrationModeLabels: Record<RegistrationMode, string> = {
  automatic: "Автоматически",
  manual: "После подтверждения",
};

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}
