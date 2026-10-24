import type {
  DifficultyLevel,
  ParticipantStatus,
  PaceType,
  RegistrationMode,
  TripStatus,
  UnpavedSurfaceDetail,
} from "@biketrips/domain";

import { DEFAULT_TRIP_TIME_ZONE } from "./trip-time";

export const difficultyLabels: Record<DifficultyLevel, string> = {
  beginner: "Для новичков",
  easy: "Легкий",
  medium: "Средний",
  hard: "Сложный",
  sport: "Спортивный",
};

/** Imported trips may lack distance, difficulty or surface; they show this instead. */
export const unknownValueLabel = "Не указано";

export function formatDifficulty(difficulty: DifficultyLevel | null): string {
  return difficulty ? difficultyLabels[difficulty] : unknownValueLabel;
}

export function formatDistance(distanceKm: number | null): string {
  return distanceKm === null ? unknownValueLabel : `${distanceKm} км`;
}

export const difficultyDescriptions: Record<DifficultyLevel, string> = {
  beginner: "Короткий простой маршрут, спокойный темп и частые остановки",
  easy: "Небольшая нагрузка и минимум подъемов",
  medium: "Для тех, кто регулярно катается; возможны подъемы и сложные участки",
  hard: "Большая дистанция, заметный набор высоты",
  sport: "Высокая интенсивность и быстрый темп; нужна хорошая подготовка",
};

export const paceLabels: Record<PaceType, string> = {
  relaxed: "Спокойно",
  steady: "Ровно",
  fast: "Быстро",
  training: "Тренировка",
};

export const unpavedSurfaceDetailLabels: Record<UnpavedSurfaceDetail, string> = {
  hardpack: "Укатанный грунт",
  gravel: "Гравий",
  crushed_stone: "Щебень",
  sand: "Песок",
  forest_trails: "Лесные тропы",
  mud: "Грязь",
  concrete_slabs: "Бетонные плиты",
};

export function formatSurfaceComposition(
  asphaltPercent: number | null,
  unpavedPercent: number | null,
): string {
  if (asphaltPercent === null || unpavedPercent === null) return unknownValueLabel;
  if (unpavedPercent === 0) return "100% асфальт";
  if (asphaltPercent === 0) return "100% грунт";
  return `${asphaltPercent}% асфальт · ${unpavedPercent}% грунт`;
}

export const tripStatusLabels: Record<TripStatus, string> = {
  draft: "Черновик",
  pending_review: "На модерации",
  changes_requested: "Требуются исправления",
  rejected: "Отклонена",
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
    timeZone: DEFAULT_TRIP_TIME_ZONE,
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: DEFAULT_TRIP_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}
