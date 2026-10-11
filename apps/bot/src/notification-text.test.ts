import { describe, expect, it } from "vitest";

import { notificationText, type NotificationJob } from "./notification-text.js";

const publicWebUrl = "https://biketrips.ru";

function job(type: NotificationJob["type"], payload: Record<string, unknown>): NotificationJob {
  return { id: "job-1", channel: "telegram", type, destination: "1", payload };
}

describe("notificationText", () => {
  it("lists key trip changes in the city timezone", () => {
    const message = notificationText(
      job("trip_updated", {
        title: "Лесной маршрут",
        publicSlug: "lesnoy-marshrut",
        timezone: "Europe/Moscow",
        changes: [
          { field: "startAt", before: "2099-08-16T07:00:00.000Z", after: "2099-08-16T08:30:00.000Z" },
          { field: "startLocation", before: "Сокольники", after: "Парк Горького" },
          { field: "route", before: "old.gpx", after: "new.gpx" },
        ],
      }),
      publicWebUrl,
    );

    expect(message.subject).toBe("Изменения в поездке «Лесной маршрут»");
    expect(message.text).toContain("10:00 → ");
    expect(message.text).toContain("11:30");
    expect(message.text).toContain("• Место старта: Сокольники → Парк Горького");
    expect(message.text).toContain("• GPX-маршрут заменён");
    expect(message.text).toContain("https://biketrips.ru/trips/lesnoy-marshrut");
  });

  it("includes start details in a cancellation", () => {
    const message = notificationText(
      job("trip_cancelled", {
        title: "Лесной маршрут",
        publicSlug: "lesnoy-marshrut",
        startAt: "2099-08-16T07:00:00.000Z",
        startLocationName: "Сокольники",
        timezone: "Europe/Moscow",
      }),
      publicWebUrl,
    );

    expect(message.subject).toBe("Поездка «Лесной маршрут» отменена");
    expect(message.text).toContain("Место: Сокольники");
    expect(message.text).toContain("10:00");
  });

  it("mentions the waitlist position", () => {
    const message = notificationText(
      job("registration_waitlisted", { title: "Лесной маршрут", waitlistPosition: 2 }),
      publicWebUrl,
    );

    expect(message.text).toContain("ваше место в очереди: 2");
  });
});
