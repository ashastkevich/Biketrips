import { createHmac, createHash } from "node:crypto";

import { BadRequestException, Injectable } from "@nestjs/common";
import jwt from "jsonwebtoken";

type TokenPayload = {
  sub: string;
  name?: string;
};

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

    const checkString = Object.entries(data)
      .filter(([key, value]) => key !== "hash" && value !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");
    const secretKey = createHash("sha256").update(botToken).digest();
    const expectedHash = createHmac("sha256", secretKey).update(checkString).digest("hex");

    if (expectedHash !== receivedHash) {
      throw new BadRequestException("Invalid Telegram auth payload");
    }

    return this.issueToken({
      sub: `telegram:${data.id}`,
      name: data.username ?? data.first_name,
    });
  }
}
