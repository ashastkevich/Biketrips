import type { TripDetail } from "@biketrips/domain";

import { tripStatusLabels } from "../lib/labels";
import { countPendingRequests } from "../lib/participant-groups";

export type OrganizerTripTone = "neutral" | "success" | "warning" | "danger" | "info";

export interface OrganizerTripState {
  label: string;
  tone: OrganizerTripTone;
  /** Explanation shown in the action panel under the trip row; null hides the panel. */
  message: string | null;
  comment: string | null;
  canEdit: boolean;
  canSubmit: boolean;
  canWithdraw: boolean;
  needsAttention: boolean;
  /** Participant requests awaiting the organizer's decision on an upcoming published trip. */
  pendingRequests: number;
  /** Lower values are listed first among upcoming created trips. */
  priority: number;
}

type OrganizerTrip = Pick<
  TripDetail,
  "status" | "moderationStatus" | "moderationComment" | "startDateTime"
> &
  Partial<Pick<TripDetail, "participants">>;

export function getOrganizerTripState(trip: OrganizerTrip, now: number): OrganizerTripState {
  const state = getModerationState(trip, now);
  const isUpcoming = new Date(trip.startDateTime).getTime() > now;
  const pendingRequests =
    isUpcoming && trip.status === "published" && trip.participants
      ? countPendingRequests({ participants: trip.participants })
      : 0;

  if (pendingRequests === 0) return state;

  return {
    ...state,
    pendingRequests,
    needsAttention: true,
    priority: Math.min(state.priority, 0),
  };
}

function getModerationState(trip: OrganizerTrip, now: number): OrganizerTripState {
  const isUpcoming = new Date(trip.startDateTime).getTime() > now;
  const isPublished = trip.status === "published";
  const comment = trip.moderationComment?.trim() || null;
  const base: OrganizerTripState = {
    label: tripStatusLabels[trip.status],
    tone: "neutral",
    message: null,
    comment: null,
    canEdit: false,
    canSubmit: false,
    canWithdraw: false,
    needsAttention: false,
    pendingRequests: 0,
    priority: 3,
  };

  if (trip.status === "cancelled" || trip.status === "finished") {
    return { ...base, tone: trip.status === "cancelled" ? "danger" : "neutral" };
  }

  switch (trip.moderationStatus) {
    case "pending_review":
      return {
        ...base,
        label: isPublished ? "Изменения на проверке" : "На проверке",
        tone: "info",
        message: isPublished
          ? "Изменения ожидают проверки администратора. До одобрения участники видят прежнюю версию."
          : "Поездка ожидает проверки администратора.",
        canWithdraw: true,
        priority: 2,
      };
    case "changes_requested":
      return {
        ...base,
        label: isPublished ? "Исправьте изменения" : "Нужны правки",
        tone: "warning",
        message: isPublished
          ? "Администратор вернул изменения на исправление. Участники видят прежнюю версию."
          : "Администратор вернул поездку на исправление.",
        comment,
        canEdit: isUpcoming,
        canSubmit: isUpcoming && !isPublished,
        needsAttention: isUpcoming,
        priority: 0,
      };
    case "rejected":
      return {
        ...base,
        label: isPublished ? "Изменения отклонены" : "Отклонена",
        tone: "danger",
        message: isPublished
          ? "Администратор отклонил изменения. Участники видят прежнюю версию."
          : "Администратор окончательно отклонил поездку.",
        comment,
      };
    case "draft":
      return {
        ...base,
        label: "Черновик",
        message: isUpcoming
          ? "Черновик не виден другим участникам. Отправьте его на модерацию, когда будет готов."
          : "Черновик не был опубликован.",
        comment,
        canEdit: isUpcoming,
        canSubmit: isUpcoming,
        needsAttention: isUpcoming,
        priority: 1,
      };
    default:
      return { ...base, tone: isPublished ? "success" : "neutral" };
  }
}
