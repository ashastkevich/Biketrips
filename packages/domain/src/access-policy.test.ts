import { describe, expect, it } from "vitest";

import { canCreateTrips, canJoinTrips } from "./index.js";

describe("access policy", () => {
  it("does not allow guests to join or create trips", () => {
    expect(canJoinTrips(null)).toBe(false);
    expect(canCreateTrips(null)).toBe(false);
  });

  it("allows every registered user to join trips", () => {
    expect(canJoinTrips({ id: "user-1", role: "user", phoneVerified: false })).toBe(true);
  });

  it("requires a filled phone to create trips", () => {
    expect(canCreateTrips({ id: "user-1", role: "user", phoneVerified: false })).toBe(false);
    expect(canCreateTrips({
      id: "user-1",
      role: "user",
      phone: "+7 (999) 000-00-00",
      phoneVerified: false,
    })).toBe(true);
  });

  it("keeps verified-phone sessions compatible", () => {
    expect(canCreateTrips({ id: "user-1", role: "user", phoneVerified: true })).toBe(true);
  });

  it("allows administrators to create trips", () => {
    expect(canCreateTrips({ id: "admin-1", role: "admin", phoneVerified: false })).toBe(true);
  });
});
