import type { TripDetail, TripParticipant } from "@biketrips/domain";

export interface ParticipantGroups {
  pending: TripParticipant[];
  confirmed: TripParticipant[];
  waitlisted: TripParticipant[];
  cancelled: TripParticipant[];
}

type TripParticipants = Pick<TripDetail, "participants"> & Partial<Pick<TripDetail, "waitlist">>;

/** Splits participants by status; the waitlist keeps its queue order. */
export function groupParticipants(trip: TripParticipants): ParticipantGroups {
  const groups: ParticipantGroups = { pending: [], confirmed: [], waitlisted: [], cancelled: [] };

  for (const participant of trip.participants) {
    groups[participant.status].push(participant);
  }

  const positions = new Map(
    (trip.waitlist ?? [])
      .filter((entry) => entry.promotedAt === null)
      .map((entry) => [entry.userId, entry.position]),
  );
  groups.waitlisted.sort(
    (left, right) =>
      (positions.get(left.userId) ?? Number.MAX_SAFE_INTEGER) -
      (positions.get(right.userId) ?? Number.MAX_SAFE_INTEGER),
  );

  return groups;
}

export function countPendingRequests(trip: Pick<TripDetail, "participants">): number {
  return trip.participants.filter((participant) => participant.status === "pending").length;
}

/** "1 заявка ждёт", "3 заявки ждут", "5 заявок ждут". */
export function formatPendingRequests(count: number): string {
  const lastTwo = count % 100;
  const last = count % 10;
  const noun =
    lastTwo >= 11 && lastTwo <= 14 ? "заявок" : last === 1 ? "заявка" : last >= 2 && last <= 4 ? "заявки" : "заявок";
  return `${count} ${noun} ${noun === "заявка" ? "ждёт" : "ждут"} подтверждения`;
}

export function normalizeTelegramUsername(username: string | null | undefined): string | null {
  const value = username?.trim().replace(/^@+/, "");
  return value ? value : null;
}

export function getParticipantInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
