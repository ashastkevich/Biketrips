import { describe, expect, it, vi } from "vitest";
import type { Repository } from "typeorm";

import type { OrganizerEntity } from "../../infrastructure/database/entities/organizer.entity.js";
import type { TelegramAccountEntity } from "../../infrastructure/database/entities/telegram-account.entity.js";
import type { TripEntity } from "../../infrastructure/database/entities/trip.entity.js";
import type { UserEntity } from "../../infrastructure/database/entities/user.entity.js";
import {
  ImportedOrganizersService,
  normalizeTelegramUsername,
} from "./imported-organizers.service.js";

const source = { handle: "MskVelo", title: "МскВело", organizerId: "channel-organizer" };
const nobody = { clubName: null, leaderUsernames: [], leaderName: null };

function setup(
  options: {
    organizers?: Partial<OrganizerEntity>[];
    account?: Partial<TelegramAccountEntity> | null;
  } = {},
) {
  const organizers = (options.organizers ?? []).map((organizer) => ({ ...organizer }));
  // Matches plain values; Raw() lookups (club names, Telegram accounts) match nothing here.
  const matches = (organizer: Partial<OrganizerEntity>, where: Record<string, unknown>) =>
    Object.entries(where).every(([key, value]) =>
      typeof value === "object" && value !== null
        ? false
        : organizer[key as keyof OrganizerEntity] === value,
    );
  const organizersRepository = {
    findOne: vi.fn(async ({ where }: { where: Record<string, unknown> }) =>
      organizers.find((organizer) => matches(organizer, where)) ?? null,
    ),
    create: vi.fn((input: Partial<OrganizerEntity>) => ({ ...input })),
    save: vi.fn(async (organizer: Partial<OrganizerEntity>) => {
      if (!organizer.id) {
        organizer.id = `organizer-${organizers.length + 1}`;
        organizers.push(organizer);
      }
      return organizer;
    }),
    delete: vi.fn().mockResolvedValue(undefined),
  };
  const usersRepository = {
    create: vi.fn((input: Partial<UserEntity>) => ({ ...input })),
    save: vi.fn(async (user: Partial<UserEntity>) => ({ id: "placeholder-user", ...user })),
    delete: vi.fn().mockResolvedValue(undefined),
  };
  const telegramAccountsRepository = { findOne: vi.fn().mockResolvedValue(options.account ?? null) };
  const tripsRepository = { update: vi.fn().mockResolvedValue(undefined) };
  const service = new ImportedOrganizersService(
    organizersRepository as unknown as Repository<OrganizerEntity>,
    usersRepository as unknown as Repository<UserEntity>,
    telegramAccountsRepository as unknown as Repository<TelegramAccountEntity>,
    tripsRepository as unknown as Repository<TripEntity>,
  );
  return { service, organizers, organizersRepository, usersRepository, tripsRepository };
}

describe("normalizeTelegramUsername", () => {
  it("lowercases and strips @, rejecting anything that is not a username", () => {
    expect(normalizeTelegramUsername("@AndreyEP")).toBe("andreyep");
    expect(normalizeTelegramUsername("t.me/andrey")).toBeNull();
    expect(normalizeTelegramUsername("abc")).toBeNull();
    expect(normalizeTelegramUsername(null)).toBeNull();
  });
});

describe("ImportedOrganizersService.resolve", () => {
  it("leaves the organizer empty when the post names nobody", async () => {
    const { service } = setup();
    await expect(service.resolve(source, nobody)).resolves.toBeNull();
  });

  it("uses the source channel when the post says the channel organizes the ride", async () => {
    const { service } = setup();
    await expect(
      service.resolve(source, { ...nobody, clubName: "«МскВело»", leaderUsernames: ["AndreyEP"] }),
    ).resolves.toBe("channel-organizer");
  });

  it("prefers a named club over the leaders and creates a placeholder club profile", async () => {
    const { service, organizers, usersRepository } = setup();

    const id = await service.resolve(source, { ...nobody, clubName: "Vel Chill", leaderUsernames: ["AndreyEP"] });

    expect(organizers).toEqual([
      expect.objectContaining({
        id,
        kind: "club",
        displayName: "Vel Chill",
        telegramUsername: null,
        isClaimed: false,
        userId: "placeholder-user",
      }),
    ]);
    expect(usersRepository.save).toHaveBeenCalledWith(expect.objectContaining({ name: "Vel Chill" }));
  });

  it("creates a placeholder for the first leader, named as in the post", async () => {
    const { service, organizers } = setup();

    await service.resolve(source, {
      ...nobody,
      leaderUsernames: ["@AndreyEP", "second_leader"],
      leaderName: "Андрей",
    });

    expect(organizers).toEqual([
      expect.objectContaining({
        kind: "person",
        displayName: "Андрей",
        telegramUsername: "andreyep",
        isClaimed: false,
      }),
    ]);
  });

  it("reuses the leader's existing profile", async () => {
    const { service, usersRepository } = setup({
      organizers: [{ id: "leader", telegramUsername: "andreyep", isClaimed: false, kind: "person" }],
    });

    await expect(
      service.resolve(source, { ...nobody, leaderUsernames: ["AndreyEP"] }),
    ).resolves.toBe("leader");
    expect(usersRepository.save).not.toHaveBeenCalled();
  });

  it("puts the trip on the profile of a user who signed in with that Telegram", async () => {
    const { service, organizers } = setup({
      organizers: [{ id: "own-profile", userId: "user-1", kind: "person" }],
      account: { userId: "user-1", username: "AndreyEP", user: { name: "Андрей" } as UserEntity },
    });

    await expect(
      service.resolve(source, { ...nobody, leaderUsernames: ["AndreyEP"] }),
    ).resolves.toBe("own-profile");
    expect(organizers).toHaveLength(1);
  });
});

describe("ImportedOrganizersService.claim", () => {
  const placeholder = {
    id: "leader",
    userId: "placeholder-user",
    telegramUsername: "andreyep",
    isClaimed: false,
    kind: "person" as const,
  };

  it("hands the placeholder profile to the user and drops the placeholder user", async () => {
    const { service, organizers, usersRepository } = setup({ organizers: [placeholder] });

    await service.claim("user-1", "AndreyEP");

    expect(organizers[0]).toMatchObject({ id: "leader", userId: "user-1", isClaimed: true });
    expect(usersRepository.delete).toHaveBeenCalledWith({ id: "placeholder-user" });
  });

  it("moves the trips onto a profile the user already has", async () => {
    const { service, organizersRepository, tripsRepository, usersRepository } = setup({
      organizers: [placeholder, { id: "own-profile", userId: "user-1", kind: "person" }],
    });

    await service.claim("user-1", "andreyep");

    expect(tripsRepository.update).toHaveBeenCalledWith(
      { importedOrganizerId: "leader" },
      { importedOrganizerId: "own-profile" },
    );
    expect(organizersRepository.delete).toHaveBeenCalledWith({ id: "leader" });
    expect(usersRepository.delete).toHaveBeenCalledWith({ id: "placeholder-user" });
  });

  it("does nothing without a matching placeholder", async () => {
    const { service, usersRepository } = setup({ organizers: [placeholder] });

    await service.claim("user-1", "someone_else");
    await service.claim("user-1", null);

    expect(usersRepository.delete).not.toHaveBeenCalled();
  });
});
