import { createHmac, createHash, timingSafeEqual } from "node:crypto";

import { BadRequestException, Injectable } from "@nestjs/common";
import jwt from "jsonwebtoken";

type TokenPayload = {
  sub: string;
  name?: string;
};

const TELEGRAM_AUTH_MAX_AGE_SECONDS = 24 * 60 * 60;

@Injectable()
export class AuthService {
  issueToken(payload: TokenPayload): { accessToken: string; tokenType: "Bearer" } {
    const secret = process.env.JWT_SECRET ?? "local-development-secret";
    return {
      accessToken: jwt.sign(payload, secret, { expiresIn: "7d" }),
      tokenType: "Bearer",
    };
  }

  loginWithTelegram(data: Record<string, string | undefined>): { accessToken: string; tokenType: "Bearer" } {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken || botToken === "replace-with-telegram-bot-token") {
      throw new BadRequestException("Telegram bot token is not configured");
    }

    const receivedHash = data.hash;

    if (!receivedHash) {
      throw new BadRequestException("Telegram auth hash is required");
    }

    const authDate = Number(data.auth_date);
    const now = Math.floor(Date.now() / 1000);

    if (
      !Number.isInteger(authDate) ||
      authDate > now + 60 ||
      now - authDate > TELEGRAM_AUTH_MAX_AGE_SECONDS
    ) {
      throw new BadRequestException("Telegram auth payload has expired");
    }

    const checkString = Object.entries(data)
      .filter(([key, value]) => key !== "hash" && value !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");
    const secretKey = createHash("sha256").update(botToken).digest();
    const expectedHash = createHmac("sha256", secretKey).update(checkString).digest("hex");
    const receivedHashBuffer = Buffer.from(receivedHash, "hex");
    const expectedHashBuffer = Buffer.from(expectedHash, "hex");

    if (
      receivedHashBuffer.length !== expectedHashBuffer.length ||
      !timingSafeEqual(receivedHashBuffer, expectedHashBuffer)
    ) {
      throw new BadRequestException("Invalid Telegram auth payload");
    }

    return this.issueToken({
      sub: `telegram:${data.id}`,
      name: data.username ?? data.first_name,
    });
  }
}
