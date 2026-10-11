import { FindOperator } from "typeorm";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { NotificationJobEntity } from "../../infrastructure/database/entities/notification-job.entity.js";
import type { TripEntity } from "../../infrastructure/database/entities/trip.entity.js";
import type { TripParticipantEntity } from "../../infrastructure/database/entities/trip-participant.entity.js";
import type { UserEntity } from "../../infrastructure/database/entities/user.entity.js";
import type { WaitlistEntryEntity } from "../../infrastructure/database/entities/waitlist-entry.entity.js";
import { NotificationsService, resolveChannels } from "./notifications.service.js";
import { snapshotTripKeyFields } from "./trip-key-changes.js";

const tripId = "11111111-1111-4111-8111-111111111111";
const organizerUserId = "44444444-4444-4444-8444-444444444444";
const telegramUserId = "22222222-2222-4222-8222-222222222222";
const emailUserId = "33333333-3333-4333-8333-333333333333";
const silentUserId = "55555555-5555-4555-8555-555555555555";
const day = 24 * 60 * 60 * 1000;

afterEach(() => {
  vi.useRealTimers();
});

describe("resolveChannels", () => {
  it("prefers Telegram, falls back to verified email and uses both for critical messages", () => {
    const both = createUser({ id: telegramUserId, telegram: true, email: true });
    const emailOnly = createUser({ id: emailUserId, email: true });
    const unverified = { ...createUser({ id: silentUserId }), email: "x@example.com" };

    expect(resolveChannels(both, false)).toEqual(["telegram"]);
    expect(resolveChannels(both, true)).toEqual(["telegram", "email"]);
    expect(resolveChannels(emailOnly, false)).toEqual(["email"]);
    expect(resolveChannels(unverified, true)).toEqual([]);
  });
});

describe("NotificationsService", () => {
  it("confirms a waitlisted registration to the participant with the queue position", async () => {
    const context = createContext();

    await context.service.enqueueRegistration(
      createTrip(),
      { userId: emailUserId, status: "waitlisted" } as TripParticipantEntity,
      3,
    );

    expect(context.jobs).toMatchObject([
      {
        channel: "email",
        type: "registration_waitlisted",
        recipientUserId: emailUserId,
        tripId,
        payload: { title: "Лесной маршрут", waitlistPosition: 3, timezone: "Europe/Moscow" },
      },
    ]);
  });

  it("does not queue anything for users without a delivery channel", async () => {
    const context = createContext();

    await context.service.enqueueRegistration(
      createTrip(),
      { userId: silentUserId, status: "confirmed" } as TripParticipantEntity,
    );

    expect(context.jobs).toEqual([]);
  });

  it("sends promotions close to the start to every channel", async () => {
    const context = createContext();

    await context.service.enqueueParticipantPromoted(
      { id: "entry-1", tripId, userId: telegramUserId, position: 1 } as WaitlistEntryEntity,
      createTrip({ startAt: new Date(Date.now() + day / 2) }),
    );

    expect(context.jobs.map((job) => job.channel)).toEqual(["telegram", "email"]);
    expect(context.jobs[0]).toMatchObject({ type: "participant_promoted", recipientUserId: telegramUserId });
  });

  it("tells the organizer about a new registration", async () => {
    const context = createContext();

    await context.service.enqueueParticipantJoined(createTrip(), {
      name: "Мария",
      status: "pending",
    } as TripParticipantEntity);

    expect(context.jobs).toMatchObject([
      {
        channel: "telegram",
        type: "participant_joined",
        recipientUserId: organizerUserId,
        payload: { participantName: "Мария", participantStatus: "pending" },
      },
    ]);
  });

  it("fans a cancellation out to active participants on all channels", async () => {
    const context = createContext();
    context.jobs.push(createJob({ type: "trip_updated", recipientUserId: telegramUserId }));

    await context.service.enqueueTripCancelled(createTrip());

    expect(context.jobs[0]?.status).toBe("skipped");
    expect(
      context.jobs.slice(1).map((job) => [job.type, job.recipientUserId, job.channel]),
    ).toEqual([
      ["trip_cancelled", telegramUserId, "telegram"],
      ["trip_cancelled", telegramUserId, "email"],
      ["trip_cancelled", emailUserId, "email"],
    ]);
    expect(context.participantsRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tripId }) }),
    );
  });

  it("queues key changes after a debounce window and merges later edits", async () => {
    vi.useFakeTimers({ now: new Date("2099-08-01T10:00:00.000Z") });
    const context = createContext();
    const original = createTrip({ startAt: new Date("2099-08-16T08:00:00.000Z") });
    const moved = createTrip({ startAt: new Date("2099-08-16T09:00:00.000Z") });

    await context.service.enqueueTripKeyChanges(moved, snapshotTripKeyFields(original));

    expect(context.jobs).toMatchObject([
      { type: "trip_updated", recipientUserId: telegramUserId, channel: "telegram" },
      { type: "trip_updated", recipientUserId: emailUserId, channel: "email" },
    ]);
    expect(context.jobs[0]?.runAt).toEqual(new Date("2099-08-01T10:10:00.000Z"));
    expect(context.jobs[0]?.payload.changes).toEqual([
      { field: "startAt", before: "2099-08-16T08:00:00.000Z", after: "2099-08-16T09:00:00.000Z" },
    ]);

    vi.setSystemTime(new Date("2099-08-01T10:05:00.000Z"));
    const renamed = createTrip({
      startAt: new Date("2099-08-16T09:00:00.000Z"),
      startLocationName: "Парк Горького",
    });
    await context.service.enqueueTripKeyChanges(renamed, snapshotTripKeyFields(moved));

    expect(context.jobs).toHaveLength(2);
    expect(context.jobs[0]?.runAt).toEqual(new Date("2099-08-01T10:15:00.000Z"));
    expect(context.jobs[0]?.payload.changes).toEqual([
      { field: "startAt", before: "2099-08-16T08:00:00.000Z", after: "2099-08-16T09:00:00.000Z" },
      { field: "startLocation", before: "Сокольники", after: "Парк Горького" },
    ]);

    const reverted = createTrip({ startAt: new Date("2099-08-16T08:00:00.000Z") });
    await context.service.enqueueTripKeyChanges(reverted, snapshotTripKeyFields(renamed));

    expect(context.jobs.map((job) => job.status)).toEqual(["skipped", "skipped"]);
  });

  it("ignores edits that do not touch key fields", async () => {
    const context = createContext();
    const trip = createTrip();

    await context.service.enqueueTripKeyChanges(trip, snapshotTripKeyFields(trip));

    expect(context.jobs).toEqual([]);
    expect(context.participantsRepository.find).not.toHaveBeenCalled();
  });

  it("sends key changes close to the start to every channel", async () => {
    const context = createContext();
    const original = createTrip({ startAt: new Date(Date.now() + day) });
    const moved = createTrip({ startAt: new Date(Date.now() + day + 60 * 60 * 1000) });

    await context.service.enqueueTripKeyChanges(moved, snapshotTripKeyFields(original));

    expect(context.jobs.map((job) => [job.recipientUserId, job.channel])).toEqual([
      [telegramUserId, "telegram"],
      [telegramUserId, "email"],
      [emailUserId, "email"],
    ]);
  });

  it("skips jobs without a destination or with an outdated registration when claiming", async () => {
    const context = createContext();
    context.jobs.push(
      createJob({ channel: "telegram", type: "registration_confirmed", recipientUserId: emailUserId }),
      createJob({ channel: "email", type: "registration_confirmed", recipientUserId: emailUserId }),
      createJob({ channel: "telegram", type: "registration_confirmed", recipientUserId: telegramUserId }),
    );

    const claimed = await context.service.claimNext();

    expect(claimed).toMatchObject({
      id: context.jobs[2]?.id,
      channel: "telegram",
      destination: "100500",
    });
    expect(context.jobs.map((job) => job.status)).toEqual(["skipped", "skipped", "processing"]);
  });

  it("retries failed deliveries with growing delays before giving up", async () => {
    vi.useFakeTimers({ now: new Date("2099-08-01T10:00:00.000Z") });
    const context = createContext();
    const job = createJob({ status: "processing" });
    context.jobs.push(job);

    await context.service.complete(job.id, false);
    expect(job).toMatchObject({ status: "queued", attempts: 1, runAt: new Date("2099-08-01T10:01:00.000Z") });

    for (const expectedAttempts of [2, 3]) {
      job.status = "processing";
      await context.service.complete(job.id, false);
      expect(job).toMatchObject({ status: "queued", attempts: expectedAttempts });
    }

    job.status = "processing";
    await context.service.complete(job.id, false);
    expect(job).toMatchObject({ status: "failed", attempts: 4 });
  });

  it("marks successful deliveries as sent", async () => {
    const context = createContext();
    const job = createJob({ status: "processing" });
    context.jobs.push(job);

    await context.service.complete(job.id, true);

    expect(job.status).toBe("sent");
  });
});

function createContext() {
  const jobs: NotificationJobEntity[] = [];
  const users = [
    createUser({ id: organizerUserId, telegram: true }),
    createUser({ id: telegramUserId, telegram: true, email: true }),
    createUser({ id: emailUserId, email: true }),
    createUser({ id: silentUserId }),
  ];
  const participants = [
    createParticipant(organizerUserId, "confirmed"),
    createParticipant(telegramUserId, "confirmed"),
    createParticipant(emailUserId, "waitlisted"),
  ].map((participant) => ({
    ...participant,
    user: users.find((user) => user.id === participant.userId)!,
  }));

  const jobsRepository = {
    create: vi.fn((input: Partial<NotificationJobEntity>) => createJob(input)),
    save: vi.fn(async (input: NotificationJobEntity | NotificationJobEntity[]) => {
      for (const job of Array.isArray(input) ? input : [input]) {
        if (!jobs.includes(job)) jobs.push(job);
      }
      return input;
    }),
    find: vi.fn(async ({ where }: { where: Record<string, unknown> }) =>
      jobs.filter((job) => matches(job, where)),
    ),
    findOne: vi.fn(async ({ where }: { where: Record<string, unknown> }) =>
      [...jobs]
        .filter((job) => matches(job, where))
        .sort((left, right) => left.runAt.getTime() - right.runAt.getTime())[0] ?? null,
    ),
    update: vi.fn(async (where: Record<string, unknown>, patch: Partial<NotificationJobEntity>) => {
      for (const job of jobs.filter((candidate) => matches(candidate, where))) Object.assign(job, patch);
    }),
  };
  const usersRepository = {
    find: vi.fn(async () => []),
    findOne: vi.fn(async ({ where }: { where: { id: string } }) =>
      users.find((user) => user.id === where.id) ?? null,
    ),
  };
  const participantsRepository = {
    find: vi.fn(async () => participants),
    findOne: vi.fn(async ({ where }: { where: { userId: string } }) =>
      participants.find((participant) => participant.userId === where.userId) ?? null,
    ),
  };

  return {
    service: new NotificationsService(
      jobsRepository as never,
      usersRepository as never,
      participantsRepository as never,
    ),
    jobs,
    participantsRepository,
  };
}

function matches(job: NotificationJobEntity, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([key, expected]) => {
    const actual = job[key as keyof NotificationJobEntity];
    if (!(expected instanceof FindOperator)) return actual === expected;
    if (expected.type === "lessThanOrEqual") return (actual as Date) <= (expected.value as Date);
    if (expected.type === "not") return actual !== null;
    throw new Error(`Unsupported operator ${expected.type}`);
  });
}

let jobCounter = 0;

function createJob(input: Partial<NotificationJobEntity> = {}): NotificationJobEntity {
  jobCounter += 1;
  return {
    id: `notification-job-${jobCounter}`,
    channel: "telegram",
    type: "trip_updated",
    recipientUserId: null,
    tripId,
    payload: {},
    status: "queued",
    attempts: 0,
    runAt: new Date(Date.now() - 1000 + jobCounter),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...input,
  };
}

function createUser(input: { id: string; telegram?: boolean; email?: boolean }): UserEntity {
  return {
    id: input.id,
    email: input.email ? `${input.id}@example.com` : null,
    emailVerifiedAt: input.email ? new Date() : null,
    telegramAccounts: input.telegram ? [{ telegramId: "100500" }] : [],
  } as UserEntity;
}

function createParticipant(
  userId: string,
  status: TripParticipantEntity["status"],
): TripParticipantEntity {
  return {
    userId,
    tripId,
    status,
    trip: { status: "published", startAt: new Date(Date.now() + 7 * day) },
  } as TripParticipantEntity;
}

function createTrip(input: Partial<TripEntity> = {}): TripEntity {
  return {
    id: tripId,
    title: "Лесной маршрут",
    publicSlug: "lesnoy-marshrut",
    startAt: new Date(Date.now() + 7 * day),
    startLocationName: "Сокольники",
    startLat: "55.790000",
    startLng: "37.680000",
    distanceKm: "42.0",
    routeFiles: [],
    organizer: { userId: organizerUserId },
    ...input,
  } as unknown as TripEntity;
}
