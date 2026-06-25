import { describe, expect, it } from "vitest";

import { decideRegistrationStatus } from "./registration-policy.js";

describe("decideRegistrationStatus", () => {
  it("confirms participants automatically when places are available", () => {
    expect(
      decideRegistrationStatus({
        confirmedParticipants: 3,
        capacity: 10,
        registrationMode: "automatic",
      })
    ).toBe("confirmed");
  });

  it("keeps participants pending for manual registration", () => {
    expect(
      decideRegistrationStatus({
        confirmedParticipants: 3,
        capacity: 10,
        registrationMode: "manual",
      })
    ).toBe("pending");
  });

  it("puts participants onto the waitlist when the trip is full", () => {
    expect(
      decideRegistrationStatus({
        confirmedParticipants: 10,
        capacity: 10,
        registrationMode: "automatic",
      })
    ).toBe("waitlisted");
  });
});
