import type {
  DifficultyLevel,
  DropPolicy,
  ParticipantStatus,
  PaceType,
  RegistrationMode,
  TripStatus,
  UnpavedSurfaceDetail,
} from "@biketrips/domain";

export const difficultyLabels: Record<DifficultyLevel, string> = {
  beginner: "Для новичков",
  easy: "Легкий",
  medium: "Средний",
  hard: "Сложный",
  sport: "Спортивный",
};

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

export function formatSurfaceComposition(asphaltPercent: number, unpavedPercent: number): string {
  if (unpavedPercent === 0) return "100% асфальт";
  if (asphaltPercent === 0) return "100% грунт";
  return `${asphaltPercent}% асфальт · ${unpavedPercent}% грунт`;
}

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
