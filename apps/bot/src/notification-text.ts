export interface NotificationJob {
  id: string;
  channel: "telegram" | "email";
  type:
    | "registration_confirmed"
    | "registration_waitlisted"
    | "registration_pending"
    | "registration_approved"
    | "registration_declined"
    | "participant_promoted"
    | "trip_updated"
    | "trip_cancelled"
    | "participant_joined"
    | "moderation_submitted"
    | "trip_approved"
    | "trip_changes_requested"
    | "trip_rejected";
  destination: string | null;
  payload: Record<string, unknown>;
}

interface NotificationText {
  subject: string;
  text: string;
}

type TripKeyChange =
  | { field: "startAt"; before: string; after: string }
  | { field: "startLocation"; before: string; after: string }
  | { field: "startPoint" }
  | { field: "distance"; before: number; after: number }
  | { field: "route"; before: string | null; after: string | null };

function stringField(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];
  return typeof value === "string" && value ? value : null;
}

function formatStartAt(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(iso));
}

function formatKm(value: number): string {
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value)} км`;
}

function describeChange(change: TripKeyChange, timezone: string): string {
  switch (change.field) {
    case "startAt":
      return `Время старта: ${formatStartAt(change.before, timezone)} → ${formatStartAt(change.after, timezone)}`;
    case "startLocation":
      return `Место старта: ${change.before} → ${change.after}`;
    case "startPoint":
      return "Точка старта на карте перенесена";
    case "distance":
      return `Дистанция: ${formatKm(change.before)} → ${formatKm(change.after)}`;
    case "route":
      if (!change.after) return "GPX-маршрут удалён";
      return change.before ? "GPX-маршрут заменён" : "Добавлен GPX-маршрут";
  }
}

export function notificationText(job: NotificationJob, publicWebUrl: string): NotificationText {
  const title = stringField(job.payload, "title") ?? "Поездка";
  const slug = stringField(job.payload, "publicSlug") ?? "";
  const comment = stringField(job.payload, "comment") ?? "";
  const timezone = stringField(job.payload, "timezone") ?? "Europe/Moscow";
  const startAt = stringField(job.payload, "startAt");
  const startLocationName = stringField(job.payload, "startLocationName");
  const tripUrl = slug ? `${publicWebUrl}/trips/${encodeURIComponent(slug)}` : publicWebUrl;
  const tripDetails = [
    startAt ? `Старт: ${formatStartAt(startAt, timezone)}` : null,
    startLocationName ? `Место: ${startLocationName}` : null,
  ].filter(Boolean).join("\n");
  const withDetails = (lead: string) => [lead, tripDetails, tripUrl].filter(Boolean).join("\n");

  switch (job.type) {
    case "registration_confirmed":
      return {
        subject: "Вы записаны на поездку",
        text: withDetails(`Вы записаны на поездку «${title}».`),
      };
    case "registration_waitlisted": {
      const position = job.payload.waitlistPosition;
      const positionText = typeof position === "number" ? `, ваше место в очереди: ${position}` : "";
      return {
        subject: "Вы в листе ожидания",
        text: withDetails(
          `Мест в поездке «${title}» пока нет — вы в листе ожидания${positionText}. ` +
            "Напишем, если место освободится.",
        ),
      };
    }
    case "registration_pending":
      return {
        subject: "Заявка отправлена организатору",
        text: withDetails(`Заявка на поездку «${title}» отправлена. Напишем, когда организатор её рассмотрит.`),
      };
    case "registration_approved":
      return {
        subject: "Заявка подтверждена",
        text: withDetails(`Организатор подтвердил вашу заявку — вы участник поездки «${title}».`),
      };
    case "registration_declined":
      return {
        subject: "Заявка отклонена",
        text: `Организатор не подтвердил ваше участие в поездке «${title}».\n${tripUrl}`,
      };
    case "participant_promoted":
      return {
        subject: "Освободилось место в поездке",
        text: withDetails(`Освободилось место — вы переведены из листа ожидания в участники поездки «${title}».`),
      };
    case "trip_cancelled":
      return {
        subject: `Поездка «${title}» отменена`,
        text: withDetails(`Организатор отменил поездку «${title}».`),
      };
    case "trip_updated": {
      const changes = Array.isArray(job.payload.changes) ? job.payload.changes as TripKeyChange[] : [];
      const lines = changes.map((change) => `• ${describeChange(change, timezone)}`);
      return {
        subject: `Изменения в поездке «${title}»`,
        text: [`Организатор изменил поездку «${title}»:`, ...lines, tripUrl].join("\n"),
      };
    }
    case "participant_joined": {
      const name = stringField(job.payload, "participantName") ?? "Участник";
      const status = job.payload.participantStatus;
      if (status === "pending") {
        return {
          subject: "Новая заявка на поездку",
          text: `Новая заявка на поездку «${title}»: ${name}. Подтвердите или отклоните её.\n${tripUrl}#participants`,
        };
      }
      if (status === "waitlisted") {
        return {
          subject: "Новый участник в листе ожидания",
          text: `В лист ожидания поездки «${title}» добавлен участник: ${name}.\n${tripUrl}#participants`,
        };
      }
      return {
        subject: "Новый участник поездки",
        text: `Новый участник поездки «${title}»: ${name}.\n${tripUrl}#participants`,
      };
    }
    case "moderation_submitted":
      return {
        subject: "Новая поездка на модерации",
        text: `Новая поездка «${title}» ожидает проверки.\n${publicWebUrl}/admin/moderation`,
      };
    case "trip_approved":
      return {
        subject: "Поездка одобрена",
        text: `Поездка «${title}» одобрена и опубликована.\n${tripUrl}`,
      };
    case "trip_changes_requested":
      return {
        subject: "Поездку нужно исправить",
        text: `Поездка «${title}» возвращена на исправление.\nКомментарий: ${comment}\n${publicWebUrl}/profile`,
      };
    case "trip_rejected":
      return {
        subject: "Поездка отклонена",
        text: `Поездка «${title}» отклонена.\nКомментарий: ${comment}\n${publicWebUrl}/profile`,
      };
  }
}
