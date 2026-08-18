import {
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

import { AuthService } from "./auth.service.js";

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(),
  },
}));

const botToken = "123456:test-token";
const originalBotToken = process.env.TELEGRAM_BOT_TOKEN;
const originalBotUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
const originalNodeEnv = process.env.NODE_ENV;
const originalJwtSecret = process.env.JWT_SECRET;
const originalEmailFrom = process.env.EMAIL_FROM;
const originalUnisenderApiKey = process.env.UNISENDER_API_KEY;
const originalUnisenderApiUrl = process.env.UNISENDER_API_URL;
const originalSmtpHost = process.env.SMTP_HOST;
const originalSmtpUser = process.env.SMTP_USER;
const originalSmtpPassword = process.env.SMTP_PASSWORD;
const originalSmtpPort = process.env.SMTP_PORT;
const originalSmtpSecure = process.env.SMTP_SECURE;

describe("AuthService Telegram login", () => {
  afterEach(() => {
    if (originalBotToken === undefined) {
      delete process.env.TELEGRAM_BOT_TOKEN;
    } else {
      process.env.TELEGRAM_BOT_TOKEN = originalBotToken;
    }
    if (originalBotUsername === undefined) {
      delete process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
    } else {
      process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME = originalBotUsername;
    }
    process.env.NODE_ENV = originalNodeEnv;
    process.env.JWT_SECRET = originalJwtSecret;
  });

  it("creates a user and Telegram account after bot confirmation", async () => {
    process.env.TELEGRAM_BOT_TOKEN = botToken;
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME = "biketrips_bot";
    process.env.JWT_SECRET = "test-secret";
    const { service, accounts, users } = createTelegramAuthService();

    const request = await service.requestTelegramLogin();
    await service.confirmTelegramLogin(
      {
        startParam: extractStartParam(request.botUrl),
        telegramId: "123456789",
        firstName: "Alex",
        username: "alex_rides",
      },
      `Bearer ${botToken}`
    );
    const result = await service.getTelegramLoginStatus({
      loginId: request.loginId,
      pollToken: request.pollToken,
    });

    expect(result.status).toBe("confirmed");
    if (result.status !== "confirmed") throw new Error("Expected confirmed login");
    const payload = jwt.verify(result.accessToken, "test-secret");
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
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME = "biketrips_bot";
    process.env.JWT_SECRET = "test-secret";
    const { service, accounts, users } = createTelegramAuthService();
    users.push(createTestUser({ id: "user-existing", name: "Existing rider" }));
    const currentToken = jwt.sign(
      { sub: "user-existing", role: "user", phoneVerified: false },
      "test-secret"
    );

    const request = await service.requestTelegramLogin(`Bearer ${currentToken}`);
    await service.confirmTelegramLogin(
      {
        startParam: extractStartParam(request.botUrl),
        telegramId: "123456789",
        firstName: "Alex",
        username: "alex_rides",
      },
      `Bearer ${botToken}`
    );
    const result = await service.getTelegramLoginStatus({
      loginId: request.loginId,
      pollToken: request.pollToken,
    });

    expect(result.status).toBe("confirmed");
    if (result.status !== "confirmed") throw new Error("Expected confirmed login");
    const payload = jwt.verify(result.accessToken, "test-secret");

    expect(payload).toMatchObject({
      sub: "user-existing",
      name: "Existing rider",
      telegramVerified: true,
    });
    expect(users).toHaveLength(1);
    expect(accounts[0]?.userId).toBe("user-existing");
  });

  it("rejects bot confirmation without bot authorization", async () => {
    process.env.TELEGRAM_BOT_TOKEN = botToken;
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME = "biketrips_bot";
    const { service } = createTelegramAuthService();
    const request = await service.requestTelegramLogin();

    await expect(
      service.confirmTelegramLogin({
        startParam: extractStartParam(request.botUrl),
        telegramId: "123456789",
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("does not allow consuming a confirmed login twice", async () => {
    process.env.TELEGRAM_BOT_TOKEN = botToken;
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME = "biketrips_bot";
    process.env.JWT_SECRET = "test-secret";
    const { service } = createTelegramAuthService();
    const request = await service.requestTelegramLogin();

    await service.confirmTelegramLogin(
      {
        startParam: extractStartParam(request.botUrl),
        telegramId: "123456789",
      },
      `Bearer ${botToken}`
    );
    await service.getTelegramLoginStatus({
      loginId: request.loginId,
      pollToken: request.pollToken,
    });

    await expect(
      service.getTelegramLoginStatus({
        loginId: request.loginId,
        pollToken: request.pollToken,
      })
    ).resolves.toMatchObject({ status: "consumed" });
  });

  it("rejects polling with an invalid poll token", async () => {
    process.env.TELEGRAM_BOT_TOKEN = botToken;
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME = "biketrips_bot";
    const { service } = createTelegramAuthService();
    const request = await service.requestTelegramLogin();

    await expect(
      service.getTelegramLoginStatus({
        loginId: request.loginId,
        pollToken: "wrong-poll-token",
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("expires pending Telegram login requests", async () => {
    process.env.TELEGRAM_BOT_TOKEN = botToken;
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME = "biketrips_bot";
    const { service, nonces } = createTelegramAuthService();
    const request = await service.requestTelegramLogin();
    const nonce = nonces.find((item) => item.id === request.loginId);
    if (!nonce) throw new Error("Expected nonce");
    nonce.expiresAt = new Date(Date.now() - 1_000);

    await expect(
      service.getTelegramLoginStatus({
        loginId: request.loginId,
        pollToken: request.pollToken,
      })
    ).resolves.toEqual({ status: "expired" });
    await expect(
      service.confirmTelegramLogin(
        {
          startParam: extractStartParam(request.botUrl),
          telegramId: "123456789",
        },
        `Bearer ${botToken}`
      )
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects linking Telegram when it belongs to another user", async () => {
    process.env.TELEGRAM_BOT_TOKEN = botToken;
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME = "biketrips_bot";
    process.env.JWT_SECRET = "test-secret";
    const { service, accounts, users } = createTelegramAuthService();
    const currentUser = createTestUser({ id: "user-current", name: "Current rider" });
    const telegramOwner = createTestUser({ id: "telegram-owner", name: "Telegram owner" });
    users.push(currentUser, telegramOwner);
    accounts.push({
      id: "telegram-existing",
      telegramId: "123456789",
      username: "owner",
      firstName: null,
      lastName: null,
      photoUrl: null,
      userId: telegramOwner.id,
      user: telegramOwner,
    });
    const currentToken = jwt.sign(
      { sub: currentUser.id, role: "user", phoneVerified: false },
      "test-secret"
    );
    const request = await service.requestTelegramLogin(`Bearer ${currentToken}`);

    await expect(
      service.confirmTelegramLogin(
        {
          startParam: extractStartParam(request.botUrl),
          telegramId: "123456789",
        },
        `Bearer ${botToken}`
      )
    ).rejects.toThrow(BadRequestException);
  });
});

describe("AuthService email login", () => {
  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.JWT_SECRET = originalJwtSecret;
    restoreEmailDeliveryEnv();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
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
      service.verifyEmailCode({ email: "rider@example.com", code: "000000" })
    ).rejects.toThrow(BadRequestException);
  });

  it("does not allow reusing an email code", async () => {
    process.env.NODE_ENV = "development";
    const { service } = createEmailAuthService();

    const requestResult = await service.requestEmailCode({ email: "rider@example.com" });
    const code = requestResult.devCode ?? "";

    await service.verifyEmailCode({ email: "rider@example.com", code });

    await expect(service.verifyEmailCode({ email: "rider@example.com", code })).rejects.toThrow(
      BadRequestException
    );
  });

  it("links a verified email to the current authenticated user", async () => {
    process.env.NODE_ENV = "development";
    process.env.JWT_SECRET = "test-secret";
    const { service, users } = createEmailAuthService();
    users.push(createTestUser({ id: "user-existing", name: "Existing rider" }));
    const currentToken = jwt.sign(
      { sub: "user-existing", role: "user", phoneVerified: false },
      "test-secret"
    );

    const requestResult = await service.requestEmailCode({ email: "rider@example.com" });
    const verifyResult = await service.verifyEmailCode(
      { email: "rider@example.com", code: requestResult.devCode ?? "" },
      `Bearer ${currentToken}`
    );
    const payload = jwt.verify(verifyResult.accessToken, "test-secret");

    expect(payload).toMatchObject({
      sub: "user-existing",
      email: "rider@example.com",
      emailVerified: true,
    });
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({
      id: "user-existing",
      email: "rider@example.com",
    });
    expect(users[0]?.emailVerifiedAt).toBeInstanceOf(Date);
  });

  it("rejects linking an email that belongs to another user", async () => {
    process.env.NODE_ENV = "development";
    process.env.JWT_SECRET = "test-secret";
    const { service, users } = createEmailAuthService();
    users.push(createTestUser({ id: "user-current", name: "Current rider" }));
    users.push(
      createTestUser({
        id: "user-email-owner",
        name: "Email owner",
        email: "rider@example.com",
        emailVerifiedAt: new Date(),
      })
    );
    const currentToken = jwt.sign(
      { sub: "user-current", role: "user", phoneVerified: false },
      "test-secret"
    );

    const requestResult = await service.requestEmailCode({ email: "rider@example.com" });

    await expect(
      service.verifyEmailCode(
        { email: "rider@example.com", code: requestResult.devCode ?? "" },
        `Bearer ${currentToken}`
      )
    ).rejects.toThrow(ConflictException);
    expect(users.find((user) => user.id === "user-current")?.email).toBeNull();
  });

  it("locks email code verification after too many invalid attempts", async () => {
    process.env.NODE_ENV = "development";
    const { service, codes } = createEmailAuthService();

    const requestResult = await service.requestEmailCode({ email: "rider@example.com" });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        service.verifyEmailCode({ email: "rider@example.com", code: "000000" })
      ).rejects.toThrow(BadRequestException);
    }
    expect(codes[0]?.attemptCount).toBe(5);

    await expect(
      service.verifyEmailCode({
        email: "rider@example.com",
        code: requestResult.devCode ?? "",
      })
    ).rejects.toMatchObject({
      message: "Слишком много попыток. Запросите новый код",
    });
  });

  it("does not send local email codes in production without delivery configuration", async () => {
    process.env.NODE_ENV = "production";
    const { service } = createEmailAuthService();

    await expect(service.requestEmailCode({ email: "rider@example.com" })).rejects.toThrow(
      ServiceUnavailableException
    );
  });

  it("sends email codes through UniSender API when an API key is configured", async () => {
    process.env.NODE_ENV = "production";
    process.env.UNISENDER_API_KEY = "unisender-api-key";
    process.env.UNISENDER_API_URL = "https://email.example.test/send";
    process.env.EMAIL_FROM = "BikeTrips Auth <login@biketrips.test>";
    const fetchMock = vi.fn<FetchMock>(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: "ok" }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { service, codes } = createEmailAuthService();

    await expect(service.requestEmailCode({ email: "rider@example.com" })).resolves.toEqual({
      ok: true,
    });

    expect(codes).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://email.example.test/send",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-API-KEY": "unisender-api-key",
        }),
      })
    );
    const firstFetchCall = fetchMock.mock.calls[0];
    if (!firstFetchCall) throw new Error("Expected UniSender request");
    const requestBody = JSON.parse(String(firstFetchCall[1].body));
    expect(requestBody).toMatchObject({
      message: {
        recipients: [{ email: "rider@example.com" }],
        from_email: "login@biketrips.test",
        from_name: "BikeTrips Auth",
        subject: "Код входа в BikeTrips",
      },
    });
    expect(requestBody.message.body.plaintext).toContain("Ваш код входа в BikeTrips");
  });

  it("does not persist an email code when UniSender delivery fails", async () => {
    process.env.NODE_ENV = "production";
    process.env.UNISENDER_API_KEY = "unisender-api-key";
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetchMock = vi.fn<FetchMock>(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        status: "error",
        message: "rejected",
        failed_emails: ["rider@example.com"],
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { service, codes } = createEmailAuthService();

    await expect(service.requestEmailCode({ email: "rider@example.com" })).rejects.toThrow(
      ServiceUnavailableException
    );

    expect(codes).toHaveLength(0);
  });

  it("uses SMTP_PASSWORD as a legacy UniSender API key fallback", async () => {
    process.env.NODE_ENV = "production";
    process.env.SMTP_PASSWORD = "legacy-api-key";
    process.env.UNISENDER_API_URL = "https://email.example.test/send";
    process.env.EMAIL_FROM = "BikeTrips <no-reply@biketrips.test>";
    const fetchMock = vi.fn<FetchMock>(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: "ok" }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { service, codes } = createEmailAuthService();

    await expect(service.requestEmailCode({ email: "rider@example.com" })).resolves.toEqual({
      ok: true,
    });

    expect(codes).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://email.example.test/send",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-API-KEY": "legacy-api-key",
        }),
      })
    );
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });
});

type EmailDeliveryResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<{ status?: string; message?: string; failed_emails?: unknown[] }>;
};

type FetchMock = (url: string, init: RequestInit) => Promise<EmailDeliveryResponse>;

function restoreEmailDeliveryEnv() {
  restoreEnvValue("EMAIL_FROM", originalEmailFrom);
  restoreEnvValue("UNISENDER_API_KEY", originalUnisenderApiKey);
  restoreEnvValue("UNISENDER_API_URL", originalUnisenderApiUrl);
  restoreEnvValue("SMTP_HOST", originalSmtpHost);
  restoreEnvValue("SMTP_USER", originalSmtpUser);
  restoreEnvValue("SMTP_PASSWORD", originalSmtpPassword);
  restoreEnvValue("SMTP_PORT", originalSmtpPort);
  restoreEnvValue("SMTP_SECURE", originalSmtpSecure);
}

function restoreEnvValue(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

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
    avatarUrl: string | null;
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
        .filter(
          (code) =>
            code.email === where.email && code.usedAt === null && code.expiresAt > new Date()
        )
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0] ?? null,
  };

  const usersRepository = {
    createQueryBuilder: () => ({
      where: (_query: string, params: { email: string }) => ({
        getOne: async () =>
          users.find((user) => user.email?.toLowerCase() === params.email) ?? null,
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
      avatarUrl: input.avatarUrl ?? null,
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
    findOne: async ({ where }: { where: { id: string } }) =>
      users.find((user) => user.id === where.id) ?? null,
  };

  return {
    service: new AuthService(
      emailCodesRepository as never,
      undefined,
      undefined,
      usersRepository as never
    ),
    codes,
    users,
  };
}

function createTestUser(
  input: Partial<{
    id: string;
    name: string;
    email: string | null;
    emailVerifiedAt: Date | null;
    role: "user" | "admin";
    phoneNumber: string | null;
    phoneVerifiedAt: Date | null;
    avatarUrl: string | null;
  }> = {}
) {
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
  const nonces: Array<{
    id: string;
    startTokenHash: string;
    pollTokenHash: string;
    requestedUserId: string | null;
    status: "pending" | "confirmed" | "consumed";
    confirmedUserId: string | null;
    expiresAt: Date;
    confirmedAt: Date | null;
    consumedAt: Date | null;
    createdAt: Date;
  }> = [];
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
    findOne: async ({ where }: { where: { telegramId?: string; userId?: string } }) =>
      accounts.find(
        (account) =>
          (where.telegramId ? account.telegramId === where.telegramId : true) &&
          (where.userId ? account.userId === where.userId : true)
      ) ?? null,
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

  const telegramLoginNoncesRepository = {
    create: (input: Partial<(typeof nonces)[number]>) => ({
      id: `nonce-${nonces.length + 1}`,
      startTokenHash: input.startTokenHash ?? "",
      pollTokenHash: input.pollTokenHash ?? "",
      requestedUserId: input.requestedUserId ?? null,
      status: input.status ?? "pending",
      confirmedUserId: input.confirmedUserId ?? null,
      expiresAt: input.expiresAt ?? new Date(),
      confirmedAt: input.confirmedAt ?? null,
      consumedAt: input.consumedAt ?? null,
      createdAt: input.createdAt ?? new Date(),
    }),
    findOne: async ({
      where,
    }: {
      where: Partial<Pick<(typeof nonces)[number], "id" | "startTokenHash" | "status">>;
    }) =>
      nonces.find(
        (nonce) =>
          (where.id ? nonce.id === where.id : true) &&
          (where.startTokenHash ? nonce.startTokenHash === where.startTokenHash : true) &&
          (where.status ? nonce.status === where.status : true)
      ) ?? null,
    save: async (nonce: (typeof nonces)[number]) => {
      const existingIndex = nonces.findIndex((item) => item.id === nonce.id);
      if (existingIndex >= 0) {
        nonces[existingIndex] = nonce;
      } else {
        nonces.push(nonce);
      }
      return nonce;
    },
  };

  return {
    service: new AuthService(
      undefined,
      telegramAccountsRepository as never,
      telegramLoginNoncesRepository as never,
      usersRepository as never
    ),
    accounts,
    nonces,
    users,
  };
}

function extractStartParam(botUrl: string): string {
  return new URL(botUrl).searchParams.get("start") ?? "";
}
