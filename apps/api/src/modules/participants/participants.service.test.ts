import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { TripEntity } from "../../infrastructure/database/entities/trip.entity.js";
import { TripParticipantEntity } from "../../infrastructure/database/entities/trip-participant.entity.js";
import { UserEntity } from "../../infrastructure/database/entities/user.entity.js";
import { WaitlistEntryEntity } from "../../infrastructure/database/entities/waitlist-entry.entity.js";
import { ParticipantsService } from "./participants.service.js";

const tripId = "11111111-1111-4111-8111-111111111111";
const firstUserId = "22222222-2222-4222-8222-222222222222";
const secondUserId = "33333333-3333-4333-8333-333333333333";

describe("ParticipantsService", () => {
  it("lists trip participants with users in creation order", async () => {
    const context = createParticipantsService({
      participants: [
        createParticipant({
          id: "second",
          createdAt: new Date("2099-08-16T09:00:00.000Z"),
        }),
        createParticipant({
          id: "first",
          userId: secondUserId,
          createdAt: new Date("2099-08-16T08:00:00.000Z"),
        }),
      ],
    });

    const participants = await context.service.listForTrip(tripId);

    expect(participants.map((participant) => participant.id)).toEqual(["first", "second"]);
    expect(context.repositories.participants.find).toHaveBeenCalledWith({
      where: { tripId },
      relations: { user: { telegramAccounts: true } },
      order: { createdAt: "ASC" },
    });
  });

  it("confirms a participant when an automatic trip has available places", async () => {
    const context = createParticipantsService({
      trips: [createTrip({ maxParticipants: 2 })],
    });

    const participant = await context.service.joinTrip(tripId, {
      userId: firstUserId,
      name: "Alex",
    });

    expect(participant).toMatchObject({
      tripId,
      userId: firstUserId,
      name: "Alex",
      telegramUsername: null,
      phone: null,
      status: "confirmed",
    });
    expect(context.users).toHaveLength(1);
    expect(context.waitlistEntries).toHaveLength(0);
  });

  it("notifies the organizer about a new participant", async () => {
    const organizerUserId = "44444444-4444-4444-8444-444444444444";
    const context = createParticipantsService({
      trips: [createTrip({ registrationMode: "manual", organizer: { userId: organizerUserId } })],
    });

    const participant = await context.service.joinTrip(tripId, {
      userId: firstUserId,
      name: "Alex",
    });

    expect(participant.status).toBe("pending");
    expect(context.notifications.enqueueRegistration).toHaveBeenCalledWith(
      context.trips[0],
      participant,
      null,
    );
    expect(context.notifications.enqueueParticipantJoined).toHaveBeenCalledWith(
      context.trips[0],
      participant
    );
    expect(context.repositories.trips.findOne).toHaveBeenCalledWith({
      where: { id: tripId },
      relations: { organizer: true, city: true },
    });
  });

  it("does not notify the organizer about joining their own trip", async () => {
    const context = createParticipantsService({
      trips: [createTrip({ organizer: { userId: firstUserId } })],
    });

    await context.service.joinTrip(tripId, { userId: firstUserId, name: "Alex" });

    expect(context.notifications.enqueueParticipantJoined).not.toHaveBeenCalled();
    expect(context.notifications.enqueueRegistration).not.toHaveBeenCalled();
  });

  it("rejects registration for trips that are not published", async () => {
    const context = createParticipantsService({
      trips: [createTrip({ status: "draft" })],
    });

    await expect(
      context.service.joinTrip(tripId, { userId: firstUserId, name: "Alex" })
    ).rejects.toThrow(BadRequestException);
    expect(context.participants).toHaveLength(0);
  });

  it("puts a participant onto the waitlist when the trip is full", async () => {
    const context = createParticipantsService({
      trips: [createTrip({ maxParticipants: 1 })],
      participants: [
        createParticipant({
          tripId,
          userId: firstUserId,
          status: "confirmed",
        }),
      ],
    });

    const participant = await context.service.joinTrip(tripId, {
      userId: secondUserId,
      name: "Maria",
    });

    expect(participant.status).toBe("waitlisted");
    expect(context.waitlistEntries).toMatchObject([
      {
        tripId,
        userId: secondUserId,
        position: 1,
        promotedAt: null,
      },
    ]);
    expect(context.notifications.enqueueRegistration).toHaveBeenCalledWith(
      context.trips[0],
      participant,
      1,
    );
  });

  it("does not allow duplicate active registration", async () => {
    const context = createParticipantsService({
      trips: [createTrip()],
      participants: [
        createParticipant({
          tripId,
          userId: firstUserId,
          status: "confirmed",
        }),
      ],
    });

    await expect(
      context.service.joinTrip(tripId, { userId: firstUserId, name: "Alex" })
    ).rejects.toThrow(BadRequestException);
    expect(context.participants).toHaveLength(1);
  });

  it("reuses a cancelled participant record and clears stale waitlist entry", async () => {
    const existing = createParticipant({
      id: "participant-1",
      tripId,
      userId: firstUserId,
      status: "cancelled",
    });
    const context = createParticipantsService({
      trips: [createTrip({ maxParticipants: 3 })],
      participants: [existing],
      waitlistEntries: [
        createWaitlistEntry({
          tripId,
          userId: firstUserId,
          position: 2,
        }),
      ],
    });

    const participant = await context.service.joinTrip(tripId, {
      userId: firstUserId,
      name: "Alex again",
    });

    expect(participant).toMatchObject({
      id: "participant-1",
      name: "Alex again",
      status: "confirmed",
    });
    expect(context.participants).toHaveLength(1);
    expect(context.waitlistEntries).toHaveLength(0);
  });

  it("promotes the next waitlisted participant when a confirmed participant cancels", async () => {
    const context = createParticipantsService({
      trips: [createTrip({ maxParticipants: 1 })],
      participants: [
        createParticipant({
          id: "confirmed-participant",
          tripId,
          userId: firstUserId,
          status: "confirmed",
        }),
        createParticipant({
          id: "waitlisted-participant",
          tripId,
          userId: secondUserId,
          status: "waitlisted",
        }),
      ],
      waitlistEntries: [
        createWaitlistEntry({
          tripId,
          userId: secondUserId,
          position: 1,
        }),
      ],
    });

    await context.service.cancelForUser(tripId, firstUserId);

    expect(
      context.participants.find((participant) => participant.userId === secondUserId)?.status
    ).toBe("confirmed");
    expect(context.waitlistEntries[0]?.promotedAt).toBeInstanceOf(Date);
    expect(context.notifications.enqueueParticipantPromoted).toHaveBeenCalledWith(
      context.waitlistEntries[0],
      context.trips[0]
    );
  });

  it("does not promote waitlist participants when a waitlisted user cancels", async () => {
    const context = createParticipantsService({
      trips: [createTrip({ maxParticipants: 1 })],
      participants: [
        createParticipant({
          id: "waitlisted-participant",
          tripId,
          userId: firstUserId,
          status: "waitlisted",
        }),
        createParticipant({
          id: "next-waitlisted-participant",
          tripId,
          userId: secondUserId,
          status: "waitlisted",
        }),
      ],
      waitlistEntries: [
        createWaitlistEntry({ tripId, userId: firstUserId, position: 1 }),
        createWaitlistEntry({ tripId, userId: secondUserId, position: 2 }),
      ],
    });

    await context.service.cancelForUser(tripId, firstUserId);

    expect(
      context.participants.find((participant) => participant.userId === secondUserId)?.status
    ).toBe("waitlisted");
    expect(context.notifications.enqueueParticipantPromoted).not.toHaveBeenCalled();
  });

  it("does not promote waitlist participants when capacity is still full", async () => {
    const context = createParticipantsService({
      trips: [createTrip({ maxParticipants: 1 })],
      participants: [
        createParticipant({
          id: "confirmed-participant",
          tripId,
          userId: firstUserId,
          status: "confirmed",
        }),
        createParticipant({
          id: "waitlisted-participant",
          tripId,
          userId: secondUserId,
          status: "waitlisted",
        }),
      ],
      waitlistEntries: [createWaitlistEntry({ tripId, userId: secondUserId })],
    });

    await context.service.updateStatus(tripId, "waitlisted-participant", "cancelled");

    expect(
      context.participants.find((participant) => participant.userId === secondUserId)?.status
    ).toBe("cancelled");
    expect(context.waitlistEntries).toHaveLength(0);
    expect(context.notifications.enqueueParticipantPromoted).not.toHaveBeenCalled();
  });

  it("promotes the earliest unpromoted waitlist entry after manual status cancellation", async () => {
    const thirdUserId = "55555555-5555-4555-8555-555555555555";
    const context = createParticipantsService({
      trips: [createTrip({ maxParticipants: 2 })],
      participants: [
        createParticipant({
          id: "confirmed-participant",
          tripId,
          userId: firstUserId,
          status: "confirmed",
        }),
        createParticipant({
          id: "second-waitlisted-participant",
          tripId,
          userId: secondUserId,
          status: "waitlisted",
        }),
        createParticipant({
          id: "third-waitlisted-participant",
          tripId,
          userId: thirdUserId,
          status: "waitlisted",
        }),
      ],
      waitlistEntries: [
        createWaitlistEntry({
          tripId,
          userId: thirdUserId,
          position: 3,
        }),
        createWaitlistEntry({
          tripId,
          userId: secondUserId,
          position: 2,
        }),
      ],
    });

    await context.service.updateStatus(tripId, "confirmed-participant", "cancelled");

    expect(
      context.participants.find((participant) => participant.userId === secondUserId)?.status
    ).toBe("confirmed");
    expect(
      context.participants.find((participant) => participant.userId === thirdUserId)?.status
    ).toBe("waitlisted");
  });

  it("removes the waitlist entry when the organizer confirms a waitlisted participant", async () => {
    const trip = createTrip({ maxParticipants: 2 });
    const context = createParticipantsService({
      trips: [trip],
      participants: [
        createParticipant({
          id: "waitlisted-participant",
          userId: secondUserId,
          status: "waitlisted",
          trip,
        }),
      ],
      waitlistEntries: [createWaitlistEntry({ tripId, userId: secondUserId })],
    });

    const participant = await context.service.updateStatus(
      tripId,
      "waitlisted-participant",
      "confirmed"
    );

    expect(participant.status).toBe("confirmed");
    expect(context.waitlistEntries).toHaveLength(0);
    expect(context.notifications.enqueueRegistrationDecision).toHaveBeenCalledWith(
      trip,
      participant,
      "approved",
    );
  });

  it("tells the participant when the organizer declines a registration", async () => {
    const trip = createTrip({ registrationMode: "manual" });
    const context = createParticipantsService({
      trips: [trip],
      participants: [
        createParticipant({ id: "pending-participant", userId: secondUserId, status: "pending", trip }),
      ],
    });

    const participant = await context.service.updateStatus(tripId, "pending-participant", "cancelled");

    expect(context.notifications.enqueueRegistrationDecision).toHaveBeenCalledWith(
      trip,
      participant,
      "declined",
    );
  });

  it("refuses to confirm a participant when the trip has no free places", async () => {
    const trip = createTrip({ maxParticipants: 1, registrationMode: "manual" });
    const context = createParticipantsService({
      trips: [trip],
      participants: [
        createParticipant({ id: "confirmed-participant", userId: firstUserId, status: "confirmed" }),
        createParticipant({
          id: "pending-participant",
          userId: secondUserId,
          status: "pending",
          trip,
        }),
      ],
    });

    await expect(
      context.service.updateStatus(tripId, "pending-participant", "confirmed")
    ).rejects.toThrow(BadRequestException);
    expect(context.participants[1]?.status).toBe("pending");
  });

  it("returns not found when cancelling missing or already cancelled registrations", async () => {
    const context = createParticipantsService({
      participants: [createParticipant({ status: "cancelled" })],
    });

    await expect(context.service.cancelForUser(tripId, secondUserId)).rejects.toThrow(
      NotFoundException
    );
    await expect(context.service.cancelForUser(tripId, firstUserId)).rejects.toThrow(
      NotFoundException
    );
  });

  it("returns null for invalid user participation lookups", async () => {
    const context = createParticipantsService();

    await expect(context.service.getForUser("not-a-uuid", firstUserId)).resolves.toBeNull();
  });

  it("throws when updating a missing participant status", async () => {
    const context = createParticipantsService();

    await expect(
      context.service.updateStatus(tripId, "missing-participant", "confirmed")
    ).rejects.toThrow(NotFoundException);
  });

  it("returns not found for invalid trip identifiers", async () => {
    const context = createParticipantsService();

    await expect(
      context.service.joinTrip("not-a-uuid", { userId: firstUserId, name: "Alex" })
    ).rejects.toThrow(NotFoundException);
    await expect(context.service.cancelForUser("not-a-uuid", firstUserId)).rejects.toThrow(
      NotFoundException
    );
  });
});

function createParticipantsService(
  input: {
    trips?: TestTrip[];
    users?: TestUser[];
    participants?: TestParticipant[];
    waitlistEntries?: TestWaitlistEntry[];
  } = {}
) {
  const trips = input.trips ?? [];
  const users = input.users ?? [];
  const participants = input.participants ?? [];
  const waitlistEntries = input.waitlistEntries ?? [];
  const notifications = {
    enqueueParticipantPromoted: vi.fn().mockResolvedValue(undefined),
    enqueueParticipantJoined: vi.fn().mockResolvedValue(undefined),
    enqueueRegistration: vi.fn().mockResolvedValue(undefined),
    enqueueRegistrationDecision: vi.fn().mockResolvedValue(undefined),
  };
  const manager = createEntityManager({ trips, users, participants, waitlistEntries });
  const dataSource = {
    transaction: vi.fn((callback) => callback(manager)),
  };
  const tripsRepository = {
    findOne: vi.fn(({ where }: { where: { id: string } }) =>
      Promise.resolve(trips.find((trip) => trip.id === where.id) ?? null)
    ),
  };
  const participantsRepository = {
    find: vi.fn(({ where }: { where: { tripId: string } }) =>
      Promise.resolve(
        participants
          .filter((participant) => participant.tripId === where.tripId)
          .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
      )
    ),
    findOne: vi.fn(({ where }: { where: { tripId: string; userId?: string; id?: string } }) =>
      Promise.resolve(
        participants.find(
          (participant) =>
            participant.tripId === where.tripId &&
            (where.userId === undefined || participant.userId === where.userId) &&
            (where.id === undefined || participant.id === where.id)
        ) ?? null
      )
    ),
    save: vi.fn(async (participant: TestParticipant) => {
      const existingIndex = participants.findIndex((item) => item.id === participant.id);
      if (existingIndex >= 0) {
        participants[existingIndex] = participant;
      } else {
        participants.push(participant);
      }
      return participant;
    }),
    count: vi.fn(({ where }: { where: { tripId: string; status?: string } }) =>
      Promise.resolve(
        participants.filter(
          (participant) =>
            participant.tripId === where.tripId &&
            (where.status === undefined || participant.status === where.status)
        ).length
      )
    ),
    update: vi.fn(
      async (where: { tripId: string; userId: string }, patch: Partial<TestParticipant>) => {
        const participant = participants.find(
          (item) => item.tripId === where.tripId && item.userId === where.userId
        );
        if (participant) Object.assign(participant, patch);
      }
    ),
  };
  const waitlistRepository = {
    findOne: vi.fn(
      ({
        where,
        order,
      }: {
        where: { tripId: string; promotedAt?: null };
        order?: { position: "ASC" };
      }) => {
        const entries = waitlistEntries.filter(
          (entry) =>
            entry.tripId === where.tripId &&
            (where.promotedAt !== null || entry.promotedAt === null)
        );
        if (order?.position === "ASC") {
          entries.sort((left, right) => left.position - right.position);
        }
        return Promise.resolve(entries[0] ?? null);
      }
    ),
    delete: vi.fn(async (where: { tripId: string; userId: string }) => {
      deleteMatching(
        waitlistEntries,
        (entry) => entry.tripId === where.tripId && entry.userId === where.userId
      );
    }),
    save: vi.fn(async (entry: TestWaitlistEntry) => {
      const existingIndex = waitlistEntries.findIndex(
        (item) => item.tripId === entry.tripId && item.userId === entry.userId
      );
      if (existingIndex >= 0) {
        waitlistEntries[existingIndex] = entry;
      } else {
        waitlistEntries.push(entry);
      }
      return entry;
    }),
  };

  return {
    service: new ParticipantsService(
      dataSource as never,
      tripsRepository as never,
      participantsRepository as never,
      waitlistRepository as never,
      notifications as never
    ),
    trips,
    users,
    participants,
    waitlistEntries,
    notifications,
    repositories: {
      participants: participantsRepository,
      waitlist: waitlistRepository,
      trips: tripsRepository,
    },
  };
}

function createEntityManager(state: {
  trips: TestTrip[];
  users: TestUser[];
  participants: TestParticipant[];
  waitlistEntries: TestWaitlistEntry[];
}) {
  return {
    findOne: vi.fn((entity: EntityClass, { where }: { where: Record<string, unknown> }) => {
      if (entity === UserEntity) {
        return Promise.resolve(state.users.find((user) => user.id === where.id) ?? null);
      }
      if (entity === TripEntity) {
        return Promise.resolve(state.trips.find((trip) => trip.id === where.id) ?? null);
      }
      if (entity === TripParticipantEntity) {
        return Promise.resolve(
          state.participants.find((participant) =>
            Object.entries(where).every(
              ([key, value]) => participant[key as keyof TestParticipant] === value
            )
          ) ?? null
        );
      }
      return Promise.resolve(null);
    }),
    create: vi.fn((_entity: EntityClass, input: Record<string, unknown>) => ({ ...input })),
    save: vi.fn(
      (entity: EntityClass | Record<string, unknown>, input?: Record<string, unknown>) => {
        const value = (input ?? entity) as Record<string, unknown>;
        if (entity === UserEntity || ("role" in value && "phoneNumber" in value)) {
          const user = createUser(value as Partial<TestUser>);
          state.users.push(user);
          return Promise.resolve(user);
        }
        if ("userId" in value && "position" in value) {
          const entry = createWaitlistEntry(value as Partial<TestWaitlistEntry>);
          state.waitlistEntries.push(entry);
          return Promise.resolve(entry);
        }
        if ("tripId" in value && "status" in value) {
          const participant = createParticipant(value as Partial<TestParticipant>);
          const existingIndex = state.participants.findIndex((item) => item.id === participant.id);
          if (existingIndex >= 0) {
            state.participants[existingIndex] = participant;
          } else {
            state.participants.push(participant);
          }
          return Promise.resolve(participant);
        }
        return Promise.resolve(value);
      }
    ),
    delete: vi.fn(async (entity: EntityClass, where: { tripId: string; userId: string }) => {
      if (entity === WaitlistEntryEntity) {
        deleteMatching(
          state.waitlistEntries,
          (entry) => entry.tripId === where.tripId && entry.userId === where.userId
        );
      }
    }),
    count: vi.fn((entity: EntityClass, { where }: { where: Record<string, unknown> }) => {
      if (entity === TripParticipantEntity) {
        return Promise.resolve(
          state.participants.filter((participant) =>
            Object.entries(where).every(
              ([key, value]) => participant[key as keyof TestParticipant] === value
            )
          ).length
        );
      }
      if (entity === WaitlistEntryEntity) {
        return Promise.resolve(
          state.waitlistEntries.filter((entry) =>
            Object.entries(where).every(
              ([key, value]) => entry[key as keyof TestWaitlistEntry] === value
            )
          ).length
        );
      }
      return Promise.resolve(0);
    }),
  };
}

function createTrip(input: Partial<TestTrip> = {}): TestTrip {
  return {
    id: tripId,
    status: "published",
    maxParticipants: null,
    registrationMode: "automatic",
    ...input,
  };
}

function createUser(input: Partial<TestUser> = {}): TestUser {
  return {
    id: firstUserId,
    name: "Alex",
    email: null,
    avatarUrl: null,
    role: "user",
    phoneNumber: null,
    phoneVerifiedAt: null,
    ...input,
  };
}

function createParticipant(input: Partial<TestParticipant> = {}): TestParticipant {
  return {
    id: `${input.userId ?? firstUserId}-participant`,
    tripId,
    userId: firstUserId,
    name: "Alex",
    telegramUsername: null,
    phone: null,
    comment: null,
    status: "confirmed",
    createdAt: new Date("2099-08-16T08:00:00.000Z"),
    ...input,
  };
}

function createWaitlistEntry(input: Partial<TestWaitlistEntry> = {}): TestWaitlistEntry {
  return {
    id: `${input.userId ?? firstUserId}-waitlist`,
    tripId,
    userId: firstUserId,
    position: 1,
    promotedAt: null,
    ...input,
  };
}

function deleteMatching<T>(items: T[], predicate: (item: T) => boolean): void {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index] as T)) items.splice(index, 1);
  }
}

type EntityClass =
  typeof UserEntity | typeof TripEntity | typeof TripParticipantEntity | typeof WaitlistEntryEntity;

type TestTrip = Pick<TripEntity, "id" | "status" | "maxParticipants" | "registrationMode"> & {
  organizer?: { userId: string };
};
type TestUser = Pick<
  UserEntity,
  "id" | "name" | "email" | "avatarUrl" | "role" | "phoneNumber" | "phoneVerifiedAt"
>;
type TestParticipant = Pick<
  TripParticipantEntity,
  | "id"
  | "tripId"
  | "userId"
  | "name"
  | "telegramUsername"
  | "phone"
  | "comment"
  | "status"
  | "createdAt"
> & { trip?: TestTrip };
type TestWaitlistEntry = Pick<
  WaitlistEntryEntity,
  "id" | "tripId" | "userId" | "position" | "promotedAt"
>;
