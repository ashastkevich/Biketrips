import { createHash, createHmac } from "node:crypto";

import { BadRequestException } from "@nestjs/common";
import { afterEach, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";

import { AuthService } from "./auth.service.js";

const botToken = "123456:test-token";
const originalBotToken = process.env.TELEGRAM_BOT_TOKEN;
const originalNodeEnv = process.env.NODE_ENV;
const originalJwtSecret = process.env.JWT_SECRET;

function signedTelegramPayload(overrides: Record<string, string> = {}) {
  const payload = {
    id: "123456789",
    first_name: "Alex",
    username: "alex_rides",
    auth_date: String(Math.floor(Date.now() / 1000)),
    ...overrides,
  };
  const checkString = Object.entries(payload)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHash("sha256").update(botToken).digest();
  const hash = createHmac("sha256", secretKey).update(checkString).digest("hex");

  return { ...payload, hash };
}

describe("AuthService Telegram login", () => {
  afterEach(() => {
    if (originalBotToken === undefined) {
      delete process.env.TELEGRAM_BOT_TOKEN;
    } else {
      process.env.TELEGRAM_BOT_TOKEN = originalBotToken;
    }
    process.env.NODE_ENV = originalNodeEnv;
    process.env.JWT_SECRET = originalJwtSecret;
  });

  it("creates a user and Telegram account for a valid Telegram payload", async () => {
    process.env.TELEGRAM_BOT_TOKEN = botToken;
    process.env.JWT_SECRET = "test-secret";
    const { service, accounts, users } = createTelegramAuthService();

    const result = await service.loginWithTelegram(signedTelegramPayload());
    const payload = jwt.verify(result.accessToken, "test-secret");

    expect(result.tokenType).toBe("Bearer");
    expect(payload).toMatchObject({
      name: "Alex",
      role: "user",
      telegram: "alex_rides",
      telegramVerified: true,
    });
    expect(users).toHaveLength(1);
    expect(accounts).toMatchObject([
      {
        telegramId: "123456789",
        username: "alex_rides",
        userId: users[0]?.id,
      },
    ]);
  });

  it("links Telegram to the current authenticated user", async () => {
    process.env.TELEGRAM_BOT_TOKEN = botToken;
    process.env.JWT_SECRET = "test-secret";
    const { service, accounts, users } = createTelegramAuthService();
    users.push(createTestUser({ id: "user-existing", name: "Existing rider" }));
    const currentToken = jwt.sign(
      { sub: "user-existing", role: "user", phoneVerified: false },
      "test-secret",
    );

    const result = await service.loginWithTelegram(
      signedTelegramPayload(),
      `Bearer ${currentToken}`,
    );
    const payload = jwt.verify(result.accessToken, "test-secret");

    expect(payload).toMatchObject({
      sub: "user-existing",
      name: "Existing rider",
      telegramVerified: true,
    });
    expect(users).toHaveLength(1);
    expect(accounts[0]?.userId).toBe("user-existing");
  });

  it("rejects an expired Telegram payload", async () => {
    process.env.TELEGRAM_BOT_TOKEN = botToken;
    const { service } = createTelegramAuthService();
    const authDate = String(Math.floor(Date.now() / 1000) - 25 * 60 * 60);

    await expect(
      service.loginWithTelegram(signedTelegramPayload({ auth_date: authDate })),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects a payload with an invalid signature", async () => {
    process.env.TELEGRAM_BOT_TOKEN = botToken;
    const { service } = createTelegramAuthService();
    const payload = signedTelegramPayload();

    await expect(
      service.loginWithTelegram({ ...payload, username: "attacker" }),
    ).rejects.toThrow(BadRequestException);
  });
});

describe("AuthService email login", () => {
  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.JWT_SECRET = originalJwtSecret;
  });

  it("issues a JWT after a valid email code", async () => {
    process.env.NODE_ENV = "development";
    process.env.JWT_SECRET = "test-secret";
    const { service } = createEmailAuthService();

    const requestResult = await service.requestEmailCode({ email: " Rider@Example.COM " });
    expect(requestResult.devCode).toMatch(/^\d{6}$/);

    const verifyResult = await service.verifyEmailCode({
      email: "rider@example.com",
      code: requestResult.devCode ?? "",
    });
    const payload = jwt.verify(verifyResult.accessToken, "test-secret");

    expect(verifyResult.tokenType).toBe("Bearer");
    expect(payload).toMatchObject({
      email: "rider@example.com",
      emailVerified: true,
      role: "user",
    });
  });

  it("rejects an invalid email code", async () => {
    process.env.NODE_ENV = "development";
    const { service } = createEmailAuthService();

    await service.requestEmailCode({ email: "rider@example.com" });

    await expect(
      service.verifyEmailCode({ email: "rider@example.com", code: "000000" }),
    ).rejects.toThrow(BadRequestException);
  });

  it("does not allow reusing an email code", async () => {
    process.env.NODE_ENV = "development";
    const { service } = createEmailAuthService();

    const requestResult = await service.requestEmailCode({ email: "rider@example.com" });
    const code = requestResult.devCode ?? "";

    await service.verifyEmailCode({ email: "rider@example.com", code });

    await expect(
      service.verifyEmailCode({ email: "rider@example.com", code }),
    ).rejects.toThrow(BadRequestException);
  });
});

function createEmailAuthService() {
  const codes: Array<{
    id: string;
    email: string;
    codeHash: string;
    attemptCount: number;
    expiresAt: Date;
    usedAt: Date | null;
    createdAt: Date;
  }> = [];
  const users: Array<{
    id: string;
    name: string;
    email: string | null;
    emailVerifiedAt: Date | null;
    role: "user" | "admin";
    phoneNumber: string | null;
    phoneVerifiedAt: Date | null;
  }> = [];

  const emailCodesRepository = {
    count: async ({ where }: { where: { email: string } }) =>
      codes.filter((code) => code.email === where.email && code.usedAt === null).length,
    create: (input: Partial<(typeof codes)[number]>) => ({
      id: `code-${codes.length + 1}`,
      email: input.email ?? "",
      codeHash: input.codeHash ?? "",
      attemptCount: input.attemptCount ?? 0,
      expiresAt: input.expiresAt ?? new Date(),
      usedAt: input.usedAt ?? null,
      createdAt: input.createdAt ?? new Date(),
    }),
    save: async (code: (typeof codes)[number]) => {
      const existingIndex = codes.findIndex((item) => item.id === code.id);
      if (existingIndex >= 0) {
        codes[existingIndex] = code;
      } else {
        codes.push(code);
      }
      return code;
    },
    findOne: async ({ where }: { where: { email: string } }) =>
      codes
        .filter((code) => code.email === where.email && code.usedAt === null && code.expiresAt > new Date())
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0] ?? null,
  };

  const usersRepository = {
    createQueryBuilder: () => ({
      where: (_query: string, params: { email: string }) => ({
        getOne: async () => users.find((user) => user.email?.toLowerCase() === params.email) ?? null,
      }),
    }),
    create: (input: Partial<(typeof users)[number]>) => ({
      id: `user-${users.length + 1}`,
      name: input.name ?? "Пользователь",
      email: input.email ?? null,
      emailVerifiedAt: input.emailVerifiedAt ?? null,
      role: input.role ?? "user",
      phoneNumber: input.phoneNumber ?? null,
      phoneVerifiedAt: input.phoneVerifiedAt ?? null,
    }),
    save: async (user: (typeof users)[number]) => {
      const existingIndex = users.findIndex((item) => item.id === user.id);
      if (existingIndex >= 0) {
        users[existingIndex] = user;
      } else {
        users.push(user);
      }
      return user;
    },
  };

  return {
    service: new AuthService(emailCodesRepository as never, undefined, usersRepository as never),
    codes,
    users,
  };
}

function createTestUser(input: Partial<{
  id: string;
  name: string;
  email: string | null;
  emailVerifiedAt: Date | null;
  role: "user" | "admin";
  phoneNumber: string | null;
  phoneVerifiedAt: Date | null;
  avatarUrl: string | null;
}> = {}) {
  return {
    id: input.id ?? "user-1",
    name: input.name ?? "Пользователь",
    email: input.email ?? null,
    emailVerifiedAt: input.emailVerifiedAt ?? null,
    role: input.role ?? "user",
    phoneNumber: input.phoneNumber ?? null,
    phoneVerifiedAt: input.phoneVerifiedAt ?? null,
    avatarUrl: input.avatarUrl ?? null,
  };
}

function createTelegramAuthService() {
  const users: Array<ReturnType<typeof createTestUser>> = [];
  const accounts: Array<{
    id: string;
    telegramId: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    photoUrl: string | null;
    userId: string;
    user: ReturnType<typeof createTestUser>;
  }> = [];

  const usersRepository = {
    findOne: async ({ where }: { where: { id: string } }) =>
      users.find((user) => user.id === where.id) ?? null,
    create: (input: Partial<ReturnType<typeof createTestUser>>) => createTestUser(input),
    save: async (user: ReturnType<typeof createTestUser>) => {
      const existingIndex = users.findIndex((item) => item.id === user.id);
      if (existingIndex >= 0) {
        users[existingIndex] = user;
      } else {
        users.push(user);
      }
      return user;
    },
  };

  const telegramAccountsRepository = {
    findOne: async ({ where }: { where: { telegramId: string } }) =>
      accounts.find((account) => account.telegramId === where.telegramId) ?? null,
    create: (input: Partial<(typeof accounts)[number]>) => ({
      id: `telegram-${accounts.length + 1}`,
      telegramId: input.telegramId ?? "",
      username: input.username ?? null,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      photoUrl: input.photoUrl ?? null,
      userId: input.userId ?? "",
      user: input.user ?? createTestUser(),
    }),
    save: async (account: (typeof accounts)[number]) => {
      const existingIndex = accounts.findIndex((item) => item.id === account.id);
      if (existingIndex >= 0) {
        accounts[existingIndex] = account;
      } else {
        accounts.push(account);
      }
      return account;
    },
  };

  return {
    service: new AuthService(undefined, telegramAccountsRepository as never, usersRepository as never),
    accounts,
    users,
  };
}
