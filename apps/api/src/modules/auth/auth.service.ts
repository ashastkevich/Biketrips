import { createHmac, createHash, randomInt, timingSafeEqual } from "node:crypto";

import { BadRequestException, HttpException, HttpStatus, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { UserRole } from "@biketrips/domain";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { IsNull, MoreThan, Repository } from "typeorm";

import { EmailAuthCodeEntity } from "../../infrastructure/database/entities/email-auth-code.entity.js";
import { UserEntity } from "../../infrastructure/database/entities/user.entity.js";

export type TokenPayload = {
  sub: string;
  name?: string;
  role: UserRole;
  phone?: string;
  phoneVerified: boolean;
  email?: string;
  emailVerified?: boolean;
};

const TELEGRAM_AUTH_MAX_AGE_SECONDS = 24 * 60 * 60;
const EMAIL_CODE_TTL_MINUTES = 15;
const EMAIL_CODE_MAX_ATTEMPTS = 5;

function stableTelegramUserId(telegramId: string): string {
  const hash = createHash("sha256").update(`telegram:${telegramId}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hashEmailCode(email: string, code: string): string {
  const secret = process.env.EMAIL_CODE_SECRET ?? process.env.JWT_SECRET ?? "local-development-secret";
  return createHmac("sha256", secret).update(`${email}:${code}`).digest("hex");
}

function safeCompareHex(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(EmailAuthCodeEntity)
    private readonly emailCodesRepository?: Repository<EmailAuthCodeEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository?: Repository<UserEntity>,
  ) {}

  issueToken(payload: TokenPayload): { accessToken: string; tokenType: "Bearer" } {
    const secret = process.env.JWT_SECRET ?? "local-development-secret";
    return {
      accessToken: jwt.sign(payload, secret, { expiresIn: "7d" }),
      tokenType: "Bearer",
    };
  }

  async requestEmailCode(input: { email: string }): Promise<{ ok: true; devCode?: string }> {
    if (!this.emailCodesRepository) {
      throw new ServiceUnavailableException("Email authorization storage is not configured");
    }

    const email = normalizeEmail(input.email);
    if (!isValidEmail(email)) {
      throw new BadRequestException("Укажите корректный адрес электронной почты");
    }

    const recentCodes = await this.emailCodesRepository.count({
      where: {
        email,
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date(Date.now() - 60 * 60 * 1000)),
      },
    });

    if (recentCodes >= 5) {
      throw new HttpException(
        "Слишком много кодов для этой почты. Попробуйте позже",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const expiresAt = new Date(Date.now() + EMAIL_CODE_TTL_MINUTES * 60 * 1000);

    await this.emailCodesRepository.save(
      this.emailCodesRepository.create({
        email,
        codeHash: hashEmailCode(email, code),
        expiresAt,
      }),
    );

    const delivery = await this.deliverEmailCode(email, code);

    return delivery === "local" ? { ok: true, devCode: code } : { ok: true };
  }

  async verifyEmailCode(input: {
    email: string;
    code: string;
  }): Promise<{ accessToken: string; tokenType: "Bearer" }> {
    if (!this.emailCodesRepository || !this.usersRepository) {
      throw new ServiceUnavailableException("Email authorization storage is not configured");
    }

    const email = normalizeEmail(input.email);
    const code = input.code.trim();
    if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
      throw new BadRequestException("Неверный код подтверждения");
    }

    const authCode = await this.emailCodesRepository.findOne({
      where: {
        email,
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: "DESC" },
    });

    if (!authCode) {
      throw new BadRequestException("Код истёк или не найден");
    }

    if (authCode.attemptCount >= EMAIL_CODE_MAX_ATTEMPTS) {
      throw new HttpException(
        "Слишком много попыток. Запросите новый код",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const expectedHash = hashEmailCode(email, code);
    if (!safeCompareHex(authCode.codeHash, expectedHash)) {
      authCode.attemptCount += 1;
      await this.emailCodesRepository.save(authCode);
      throw new BadRequestException("Неверный код подтверждения");
    }

    authCode.usedAt = new Date();
    await this.emailCodesRepository.save(authCode);

    const user = await this.findOrCreateEmailUser(email);

    return this.issueToken({
      sub: user.id,
      name: user.name,
      role: user.role,
      phone: user.phoneNumber ?? undefined,
      phoneVerified: user.phoneVerifiedAt !== null,
      email: user.email ?? undefined,
      emailVerified: user.emailVerifiedAt !== null,
    });
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
      sub: stableTelegramUserId(data.id ?? ""),
      name: data.username ?? data.first_name,
      role: "user",
      phoneVerified: false,
    });
  }

  private async findOrCreateEmailUser(email: string): Promise<UserEntity> {
    if (!this.usersRepository) {
      throw new ServiceUnavailableException("User storage is not configured");
    }

    const existingUser = await this.usersRepository
      .createQueryBuilder("user")
      .where("lower(user.email) = :email", { email })
      .getOne();

    if (existingUser) {
      existingUser.email = email;
      existingUser.emailVerifiedAt = new Date();
      return this.usersRepository.save(existingUser);
    }

    const name = email.split("@")[0] || "Пользователь";
    return this.usersRepository.save(
      this.usersRepository.create({
        name,
        email,
        emailVerifiedAt: new Date(),
        role: "user",
      }),
    );
  }

  private async deliverEmailCode(email: string, code: string): Promise<"email" | "local"> {
    const subject = "Код входа в BikeTrips";
    const text = `Ваш код входа в BikeTrips: ${code}. Он действует ${EMAIL_CODE_TTL_MINUTES} минут.`;
    const smtpHost = process.env.SMTP_HOST?.trim();
    const smtpUser = process.env.SMTP_USER?.trim();
    const smtpPassword = process.env.SMTP_PASSWORD;

    if (!smtpHost || !smtpUser || !smtpPassword) {
      if (process.env.NODE_ENV === "production") {
        throw new ServiceUnavailableException("SMTP delivery is not configured");
      }
      console.info(`[BikeTrips] Email login code for ${email}: ${code}`);
      return "local";
    }

    const port = Number(process.env.SMTP_PORT ?? "587");
    const secure = process.env.SMTP_SECURE === "true";
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number.isInteger(port) ? port : 587,
      secure,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
      requireTLS: !secure,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 10_000,
    });

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM ?? "BikeTrips <no-reply@biketrips.local>",
        to: email,
        subject,
        text,
        html: `<p>Ваш код входа в BikeTrips:</p><p><strong>${code}</strong></p><p>Он действует ${EMAIL_CODE_TTL_MINUTES} минут.</p>`,
      });
      return "email";
    } catch {
      throw new ServiceUnavailableException("Не удалось отправить код входа");
    }
  }
}
