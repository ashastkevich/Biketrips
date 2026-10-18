import { describe, expect, it } from "vitest";

import { getLocalStartValues, getTodayInTimeZone, toTripStartAt } from "./trip-time";

describe("trip time helpers", () => {
  it("keeps Moscow trip clock time when serializing local form values", () => {
    expect(toTripStartAt("2099-08-16", "10:30", "Europe/Moscow")).toBe(
      "2099-08-16T10:30:00+03:00",
    );
  });

  it("reads local trip values in the requested time zone", () => {
    expect(getLocalStartValues("2099-08-16T07:30:00.000Z", "Europe/Moscow")).toEqual({
      date: "2099-08-16",
      time: "10:30",
    });
  });

  it("returns today's date in the trip time zone", () => {
    const lateEveningUtc = new Date("2099-08-16T22:30:00.000Z");
    expect(getTodayInTimeZone("Europe/Moscow", lateEveningUtc)).toBe("2099-08-17");
    expect(getTodayInTimeZone("UTC", lateEveningUtc)).toBe("2099-08-16");
  });
});
