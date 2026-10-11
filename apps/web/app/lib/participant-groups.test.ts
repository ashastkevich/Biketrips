import type { TripParticipant } from "@biketrips/domain";
import { describe, expect, it } from "vitest";

import {
  countPendingRequests,
  formatPendingRequests,
  getParticipantInitials,
  groupParticipants,
} from "./participant-groups";

function participant(input: Partial<TripParticipant>): TripParticipant {
  return {
    id: input.userId ?? "participant",
    status: "confirmed",
    userId: "user",
    name: "Анна",
    ...input,
  };
}

describe("participant groups", () => {
  it("groups participants by status and orders the waitlist by queue position", () => {
    const groups = groupParticipants({
      participants: [
        participant({ userId: "a", status: "confirmed" }),
        participant({ userId: "b", status: "waitlisted" }),
        participant({ userId: "c", status: "pending" }),
        participant({ userId: "d", status: "waitlisted" }),
        participant({ userId: "e", status: "cancelled" }),
      ],
      waitlist: [
        { id: "w1", position: 2, userId: "b", promotedAt: null },
        { id: "w2", position: 1, userId: "d", promotedAt: null },
      ],
    });

    expect(groups.confirmed.map((item) => item.userId)).toEqual(["a"]);
    expect(groups.pending.map((item) => item.userId)).toEqual(["c"]);
    expect(groups.waitlisted.map((item) => item.userId)).toEqual(["d", "b"]);
    expect(groups.cancelled.map((item) => item.userId)).toEqual(["e"]);
  });

  it("counts pending requests", () => {
    expect(
      countPendingRequests({
        participants: [
          participant({ userId: "a", status: "pending" }),
          participant({ userId: "b", status: "confirmed" }),
          participant({ userId: "c", status: "pending" }),
        ],
      }),
    ).toBe(2);
  });

  it("pluralizes pending requests", () => {
    expect(formatPendingRequests(1)).toBe("1 заявка ждёт подтверждения");
    expect(formatPendingRequests(3)).toBe("3 заявки ждут подтверждения");
    expect(formatPendingRequests(5)).toBe("5 заявок ждут подтверждения");
    expect(formatPendingRequests(12)).toBe("12 заявок ждут подтверждения");
    expect(formatPendingRequests(21)).toBe("21 заявка ждёт подтверждения");
  });

  it("builds initials from up to two name parts", () => {
    expect(getParticipantInitials("анна  петрова иванова")).toBe("АП");
  });
});
