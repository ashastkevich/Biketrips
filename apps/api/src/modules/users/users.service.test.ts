import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { CityEntity } from "../../infrastructure/database/entities/city.entity.js";
import type { UserEntity } from "../../infrastructure/database/entities/user.entity.js";
import { UsersService } from "./users.service.js";

const userId = "11111111-1111-4111-8111-111111111111";
const cityId = "22222222-2222-4222-8222-222222222222";

describe("UsersService", () => {
  it("throws when a user cannot be found", async () => {
    const context = createUsersService();

    await expect(context.service.get(userId)).rejects.toThrow(NotFoundException);
  });

  it("normalizes email when creating a user", async () => {
    const context = createUsersService();

    const user = await context.service.create({
      name: "Alex",
      email: " Rider@Example.COM ",
    });

    expect(user).toMatchObject({
      name: "Alex",
      email: "rider@example.com",
      emailVerifiedAt: null,
    });
    expect(context.users).toHaveLength(1);
  });

  it("updates profile fields and keeps email verification when email is unchanged", async () => {
    const verifiedAt = new Date("2026-08-16T08:00:00.000Z");
    const city = createCity();
    const context = createUsersService({
      users: [
        createUser({
          email: "rider@example.com",
          emailVerifiedAt: verifiedAt,
        }),
      ],
      cities: [city],
    });

    const user = await context.service.update(userId, {
      name: "Alex Rider",
      email: " RIDER@example.com ",
      phoneNumber: " +7 (999) 000-00-00 ",
      cityId,
    });

    expect(user).toMatchObject({
      name: "Alex Rider",
      email: "rider@example.com",
      emailVerifiedAt: verifiedAt,
      phoneNumber: "+7 (999) 000-00-00",
      cityId,
      city,
    });
  });

  it("resets email verification when email changes", async () => {
    const context = createUsersService({
      users: [
        createUser({
          email: "old@example.com",
          emailVerifiedAt: new Date("2026-08-16T08:00:00.000Z"),
        }),
      ],
    });

    const user = await context.service.update(userId, {
      name: "Alex",
      email: "new@example.com",
    });

    expect(user.email).toBe("new@example.com");
    expect(user.emailVerifiedAt).toBeNull();
  });

  it("rejects an email that belongs to another user case-insensitively", async () => {
    const context = createUsersService({
      users: [
        createUser({ id: userId, email: "current@example.com" }),
        createUser({
          id: "33333333-3333-4333-8333-333333333333",
          email: "Rider@Example.com",
        }),
      ],
    });

    await expect(
      context.service.update(userId, {
        name: "Alex",
        email: "rider@example.com",
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects unknown cities", async () => {
    const context = createUsersService({
      users: [createUser()],
    });

    await expect(
      context.service.update(userId, {
        name: "Alex",
        cityId,
      })
    ).rejects.toThrow(BadRequestException);
  });
});

function createUsersService(input: { users?: TestUser[]; cities?: TestCity[] } = {}) {
  const users = input.users ?? [];
  const cities = input.cities ?? [];
  const usersRepository = {
    findOne: vi.fn(({ where }: { where: { id: string } }) =>
      Promise.resolve(users.find((user) => user.id === where.id) ?? null)
    ),
    create: vi.fn((inputUser: Partial<TestUser>) => createUser(inputUser)),
    save: vi.fn(async (user: TestUser) => {
      const existingIndex = users.findIndex((item) => item.id === user.id);
      if (existingIndex >= 0) {
        users[existingIndex] = user;
      } else {
        users.push(user);
      }
      return user;
    }),
    createQueryBuilder: vi.fn(() => createUserQueryBuilder(users)),
  };
  const citiesRepository = {
    findOne: vi.fn(({ where }: { where: { id: string } }) =>
      Promise.resolve(cities.find((city) => city.id === where.id) ?? null)
    ),
  };

  return {
    service: new UsersService(usersRepository as never, citiesRepository as never),
    users,
    cities,
  };
}

function createUserQueryBuilder(users: TestUser[]) {
  const state: { email?: string; excludedId?: string } = {};

  return {
    where: vi.fn((_condition: string, params: { email: string }) => {
      state.email = params.email;
      return createUserQueryBuilderApi(users, state);
    }),
  };
}

function createUserQueryBuilderApi(
  users: TestUser[],
  state: { email?: string; excludedId?: string }
) {
  const api = {
    andWhere: vi.fn((_condition: string, params: { id: string }) => {
      state.excludedId = params.id;
      return api;
    }),
    getOne: vi.fn(() =>
      Promise.resolve(
        users.find(
          (user) => user.id !== state.excludedId && user.email?.toLowerCase() === state.email
        ) ?? null
      )
    ),
  };

  return api;
}

function createUser(input: Partial<TestUser> = {}): TestUser {
  return {
    id: userId,
    name: "Alex",
    email: null,
    emailVerifiedAt: null,
    role: "user",
    phoneNumber: null,
    phoneVerifiedAt: null,
    avatarUrl: null,
    cityId: null,
    city: null,
    ...input,
  };
}

function createCity(input: Partial<TestCity> = {}): TestCity {
  return {
    id: cityId,
    name: "Москва",
    slug: "moscow",
    timezone: "Europe/Moscow",
    centerLat: "55.755864",
    centerLng: "37.617698",
    ...input,
  };
}

type TestUser = Pick<
  UserEntity,
  | "id"
  | "name"
  | "email"
  | "emailVerifiedAt"
  | "role"
  | "phoneNumber"
  | "phoneVerifiedAt"
  | "avatarUrl"
  | "cityId"
  | "city"
>;
type TestCity = Pick<CityEntity, "id" | "name" | "slug" | "timezone" | "centerLat" | "centerLng">;
