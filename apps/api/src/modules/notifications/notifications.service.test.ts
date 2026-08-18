import { describe, expect, it, vi } from "vitest";

import type { NotificationJobEntity } from "../../infrastructure/database/entities/notification-job.entity.js";
import type { TripEntity } from "../../infrastructure/database/entities/trip.entity.js";
import type { WaitlistEntryEntity } from "../../infrastructure/database/entities/waitlist-entry.entity.js";
import { NotificationsService } from "./notifications.service.js";

const tripId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";

describe("NotificationsService", () => {
  it("queues Telegram notifications for published trips", async () => {
    const context = createNotificationsService();
    const trip = createTrip({
      title: "Лесной маршрут",
      publicSlug: "lesnoy-marshrut",
    });

    await context.service.enqueueTripStatusNotification(trip, "published");

    expect(context.jobs).toMatchObject([
      {
        channel: "telegram",
        type: "trip_published",
        tripId,
        recipientUserId: null,
        payload: {
          title: "Лесной маршрут",
          publicSlug: "lesnoy-marshrut",
          status: "published",
        },
        status: "queued",
      },
    ]);
  });

  it("queues Telegram notifications for cancelled trips", async () => {
    const context = createNotificationsService();
    const trip = createTrip({
      title: "Отменённая поездка",
      publicSlug: "cancelled-trip",
    });

    await context.service.enqueueTripStatusNotification(trip, "cancelled");

    expect(context.jobs).toMatchObject([
      {
        channel: "telegram",
        type: "trip_cancelled",
        tripId,
        recipientUserId: null,
        payload: {
          title: "Отменённая поездка",
          publicSlug: "cancelled-trip",
          status: "cancelled",
        },
      },
    ]);
  });

  it("queues Telegram notifications for trip updates", async () => {
    const context = createNotificationsService();
    const trip = createTrip({
      title: "Обновлённый маршрут",
      publicSlug: "updated-route",
    });

    await context.service.enqueueTripUpdatedNotification(trip);

    expect(context.jobs).toMatchObject([
      {
        channel: "telegram",
        type: "trip_updated",
        tripId,
        recipientUserId: null,
        payload: {
          title: "Обновлённый маршрут",
          publicSlug: "updated-route",
        },
      },
    ]);
  });

  it("queues targeted Telegram notifications for promoted waitlist participants", async () => {
    const context = createNotificationsService();

    await context.service.enqueueParticipantPromoted({
      id: "waitlist-entry-1",
      tripId,
      userId,
      position: 2,
    } as WaitlistEntryEntity);

    expect(context.jobs).toMatchObject([
      {
        channel: "telegram",
        type: "participant_promoted",
        tripId,
        recipientUserId: userId,
        payload: {
          waitlistEntryId: "waitlist-entry-1",
          position: 2,
        },
      },
    ]);
  });
});

function createNotificationsService() {
  const jobs: TestNotificationJob[] = [];
  const jobsRepository = {
    create: vi.fn((job: Partial<TestNotificationJob>) => createNotificationJob(job)),
    save: vi.fn(async (job: TestNotificationJob) => {
      jobs.push(job);
      return job;
    }),
  };

  return {
    service: new NotificationsService(jobsRepository as never),
    jobs,
    jobsRepository,
  };
}

function createNotificationJob(input: Partial<TestNotificationJob> = {}): TestNotificationJob {
  return {
    id: `notification-job-${Date.now()}`,
    channel: input.channel ?? "telegram",
    type: input.type ?? "trip_updated",
    recipientUserId: input.recipientUserId ?? null,
    tripId: input.tripId ?? null,
    payload: input.payload ?? {},
    status: input.status ?? "queued",
    runAt: input.runAt ?? new Date("2099-08-16T08:00:00.000Z"),
    createdAt: input.createdAt ?? new Date("2099-08-16T08:00:00.000Z"),
    updatedAt: input.updatedAt ?? new Date("2099-08-16T08:00:00.000Z"),
  };
}

function createTrip(input: Partial<TripEntity> = {}): TripEntity {
  return {
    id: tripId,
    title: input.title ?? "Лесной маршрут",
    publicSlug: input.publicSlug ?? "lesnoy-marshrut",
  } as TripEntity;
}

type TestNotificationJob = NotificationJobEntity;
