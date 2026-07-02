import { createHash, createHmac } from "node:crypto";

import { BadRequestException } from "@nestjs/common";
import { afterEach, describe, expect, it } from "vitest";

import { AuthService } from "./auth.service.js";

const botToken = "123456:test-token";
const originalBotToken = process.env.TELEGRAM_BOT_TOKEN;

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
  });

  it("issues a JWT for a valid Telegram payload", () => {
    process.env.TELEGRAM_BOT_TOKEN = botToken;

    const result = new AuthService().loginWithTelegram(signedTelegramPayload());

    expect(result.tokenType).toBe("Bearer");
    expect(result.accessToken.split(".")).toHaveLength(3);
  });

  it("rejects an expired Telegram payload", () => {
    process.env.TELEGRAM_BOT_TOKEN = botToken;
    const authDate = String(Math.floor(Date.now() / 1000) - 25 * 60 * 60);

    expect(() =>
      new AuthService().loginWithTelegram(signedTelegramPayload({ auth_date: authDate }))
    ).toThrow(BadRequestException);
  });

  it("rejects a payload with an invalid signature", () => {
    process.env.TELEGRAM_BOT_TOKEN = botToken;
    const payload = signedTelegramPayload();

    expect(() =>
      new AuthService().loginWithTelegram({ ...payload, username: "attacker" })
    ).toThrow(BadRequestException);
  });
});
