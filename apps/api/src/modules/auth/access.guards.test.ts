import { ForbiddenException, type ExecutionContext } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import type { AuthenticatedUser } from "@biketrips/domain";

import { AdminGuard, TripCreatorGuard } from "./access.guards.js";

describe("auth access guards", () => {
  it("requires a Telegram-linked user to create trips", () => {
    const guard = new TripCreatorGuard();

    expect(() => guard.canActivate(createContext(null))).toThrow(ForbiddenException);
    expect(() =>
      guard.canActivate(
        createContext({
          id: "user-1",
          role: "user",
          phoneVerified: false,
        })
      )
    ).toThrow(ForbiddenException);

    expect(() =>
      guard.canActivate(
        createContext({
          id: "user-1",
          role: "user",
          phone: "+7 (999) 000-00-00",
          phoneVerified: false,
        })
      )
    ).toThrow(ForbiddenException);
    expect(
      guard.canActivate(
        createContext({
          id: "user-1",
          role: "user",
          phoneVerified: false,
          telegram: "alex_rides",
          telegramVerified: true,
        })
      )
    ).toBe(true);
    expect(
      guard.canActivate(
        createContext({
          id: "admin-1",
          role: "admin",
          phoneVerified: false,
        })
      )
    ).toBe(true);
  });

  it("requires administrator role for admin-only actions", () => {
    const guard = new AdminGuard();

    expect(() => guard.canActivate(createContext(null))).toThrow(ForbiddenException);
    expect(() =>
      guard.canActivate(
        createContext({
          id: "user-1",
          role: "user",
          phoneVerified: true,
        })
      )
    ).toThrow(ForbiddenException);
    expect(
      guard.canActivate(
        createContext({
          id: "admin-1",
          role: "admin",
          phoneVerified: false,
        })
      )
    ).toBe(true);
  });
});

function createContext(user: AuthenticatedUser | null): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as ExecutionContext;
}
