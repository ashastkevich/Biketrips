import { describe, expect, it } from "vitest";

import { getOrganizerTripState } from "./organizer-trip-state";

const now = Date.parse("2026-10-11T10:00:00Z");
const future = "2026-10-20T08:00:00Z";
const past = "2026-10-01T08:00:00Z";

describe("getOrganizerTripState", () => {
  it("lets organizers edit and submit an upcoming draft", () => {
    const state = getOrganizerTripState(
      { status: "draft", moderationStatus: "draft", moderationComment: null, startDateTime: future },
      now,
    );

    expect(state).toMatchObject({
      label: "Черновик",
      canEdit: true,
      canSubmit: true,
      canWithdraw: false,
      needsAttention: true,
    });
    expect(state.message).not.toBeNull();
  });

  it("offers only withdrawal while a trip awaits review", () => {
    const state = getOrganizerTripState(
      {
        status: "pending_review",
        moderationStatus: "pending_review",
        moderationComment: null,
        startDateTime: future,
      },
      now,
    );

    expect(state).toMatchObject({
      label: "На проверке",
      canEdit: false,
      canSubmit: false,
      canWithdraw: true,
      needsAttention: false,
    });
  });

  it("shows the moderator comment and puts returned trips first", () => {
    const returned = getOrganizerTripState(
      {
        status: "changes_requested",
        moderationStatus: "changes_requested",
        moderationComment: " Уточните точку старта ",
        startDateTime: future,
      },
      now,
    );
    const draft = getOrganizerTripState(
      { status: "draft", moderationStatus: "draft", moderationComment: null, startDateTime: future },
      now,
    );

    expect(returned).toMatchObject({
      comment: "Уточните точку старта",
      canEdit: true,
      canSubmit: true,
      needsAttention: true,
    });
    expect(returned.priority).toBeLessThan(draft.priority);
  });

  it("does not resubmit a published trip whose changes were returned", () => {
    const state = getOrganizerTripState(
      {
        status: "published",
        moderationStatus: "changes_requested",
        moderationComment: null,
        startDateTime: future,
      },
      now,
    );

    expect(state).toMatchObject({ label: "Исправьте изменения", canEdit: true, canSubmit: false });
  });

  it("hides the action panel for an approved published trip", () => {
    const state = getOrganizerTripState(
      { status: "published", moderationStatus: "approved", moderationComment: null, startDateTime: future },
      now,
    );

    expect(state).toMatchObject({ label: "Опубликована", tone: "success", message: null });
  });

  it("disables actions for past drafts", () => {
    const state = getOrganizerTripState(
      { status: "draft", moderationStatus: "draft", moderationComment: null, startDateTime: past },
      now,
    );

    expect(state).toMatchObject({ canEdit: false, canSubmit: false, needsAttention: false });
  });

  it("flags upcoming published trips with pending participant requests", () => {
    const participants = [
      { id: "p1", userId: "u1", name: "Анна", status: "pending" as const },
      { id: "p2", userId: "u2", name: "Иван", status: "confirmed" as const },
    ];
    const trip = {
      status: "published" as const,
      moderationStatus: "approved" as const,
      moderationComment: null,
      participants,
    };

    expect(getOrganizerTripState({ ...trip, startDateTime: future }, now)).toMatchObject({
      pendingRequests: 1,
      needsAttention: true,
      priority: 0,
    });
    expect(getOrganizerTripState({ ...trip, startDateTime: past }, now)).toMatchObject({
      pendingRequests: 0,
      needsAttention: false,
    });
  });
});
