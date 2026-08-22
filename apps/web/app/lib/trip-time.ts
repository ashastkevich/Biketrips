export const DEFAULT_TRIP_TIME_ZONE = "Europe/Moscow";

function parseLocalDateTime(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  if (
    !year ||
    !month ||
    !day ||
    hour === undefined ||
    minute === undefined ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return null;
  }

  return { year, month, day, hour, minute };
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
  }).formatToParts(date);
  const timeZoneName = parts.find((part) => part.type === "timeZoneName")?.value ?? "";
  const match = timeZoneName.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);

  if (!match) return 0;

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? "0");

  return sign * (hours * 60 + minutes);
}

function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? "-" : "+";
  const absolute = Math.abs(minutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, "0");
  const restMinutes = String(absolute % 60).padStart(2, "0");

  return `${sign}${hours}:${restMinutes}`;
}

export function toTripStartAt(date: string, time: string, timeZone: string): string {
  const parsed = parseLocalDateTime(date, time);
  if (!parsed) return "";

  const utcGuess = Date.UTC(
    parsed.year,
    parsed.month - 1,
    parsed.day,
    parsed.hour,
    parsed.minute,
  );
  let offsetMinutes = getTimeZoneOffsetMinutes(new Date(utcGuess), timeZone);
  const adjusted = utcGuess - offsetMinutes * 60_000;
  const adjustedOffsetMinutes = getTimeZoneOffsetMinutes(new Date(adjusted), timeZone);
  if (adjustedOffsetMinutes !== offsetMinutes) offsetMinutes = adjustedOffsetMinutes;

  return `${date}T${time}:00${formatOffset(offsetMinutes)}`;
}

export function getLocalStartValues(
  startDateTime: string,
  timeZone: string = DEFAULT_TRIP_TIME_ZONE,
) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(startDateTime));
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    time: `${value("hour")}:${value("minute")}`,
  };
}
