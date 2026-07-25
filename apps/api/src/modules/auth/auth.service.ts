import { createHmac, createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

import { BadRequestException, HttpException, HttpStatus, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { UserRole } from "@biketrips/domain";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { IsNull, MoreThan, Repository } from "typeorm";

import { EmailAuthCodeEntity } from "../../infrastructure/database/entities/email-auth-code.entity.js";
import { TelegramAccountEntity } from "../../infrastructure/database/entities/telegram-account.entity.js";
import { TelegramLoginNonceEntity } from "../../infrastructure/database/entities/telegram-login-nonce.entity.js";
import { UserEntity } from "../../infrastructure/database/entities/user.entity.js";

export type TokenPayload = {
  sub: string;
  name?: string;
  role: UserRole;
  phone?: string;
  phoneVerified: boolean;
  email?: string;
  emailVerified?: boolean;
  telegram?: string;
  telegramVerified?: boolean;
};

const EMAIL_CODE_TTL_MINUTES = 15;
const EMAIL_CODE_MAX_ATTEMPTS = 5;
const TELEGRAM_LOGIN_TTL_MINUTES = 10;
const DEFAULT_UNISENDER_API_URL = "https://goapi.unisender.ru/ru/transactional/api/v1/email/send.json";

function stableTelegramUserId(telegramId: string): string {
  const hash = createHash("sha256").update(`telegram:${telegramId}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function randomBase64Url(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

function hashTelegramLoginToken(token: string): string {
  const secret = process.env.TELEGRAM_LOGIN_SECRET ?? process.env.JWT_SECRET ?? "local-development-secret";
  return createHmac("sha256", secret).update(token).digest("hex");
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

function parseEmailFrom(value: string): { email: string; name?: string } {
  const match = value.match(/^\s*(.*?)\s*<([^<>]+)>\s*$/);
  if (match) {
    return {
      name: match[1]?.trim() || undefined,
      email: match[2]?.trim() ?? value.trim(),
    };
  }

  return { email: value.trim() };
}

function compactName(parts: Array<string | undefined>): string {
  return parts.map((part) => part?.trim()).filter(Boolean).join(" ");
}

function getTelegramBotUsername(): string | null {
  const username = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "");
  return username || null;
}

function parseTelegramStartToken(startParam: string): string {
  const value = startParam.trim();
  return value.startsWith("login_") ? value.slice("login_".length) : value;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(EmailAuthCodeEntity)
    private readonly emailCodesRepository?: Repository<EmailAuthCodeEntity>,
    @InjectRepository(TelegramAccountEntity)
    private readonly telegramAccountsRepository?: Repository<TelegramAccountEntity>,
    @InjectRepository(TelegramLoginNonceEntity)
    private readonly telegramLoginNoncesRepository?: Repository<TelegramLoginNonceEntity>,
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

    const delivery = await this.deliverEmailCode(email, code);

    await this.emailCodesRepository.save(
      this.emailCodesRepository.create({
        email,
        codeHash: hashEmailCode(email, code),
        expiresAt,
      }),
    );

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

  async requestTelegramLogin(authorizationHeader?: string): Promise<{
    loginId: string;
    pollToken: string;
    botUrl: string;
    expiresAt: string;
  }> {
    if (!this.telegramLoginNoncesRepository) {
      throw new ServiceUnavailableException("Telegram authorization storage is not configured");
    }

    const botUsername = getTelegramBotUsername();
    if (!botUsername || botUsername === "replace-with-telegram-bot-username") {
      throw new BadRequestException("Telegram bot username is not configured");
    }

    const currentUser = await this.findCurrentUser(authorizationHeader);
    const startToken = randomBase64Url();
    const pollToken = randomBase64Url();
    const expiresAt = new Date(Date.now() + TELEGRAM_LOGIN_TTL_MINUTES * 60 * 1000);
    const nonce = await this.telegramLoginNoncesRepository.save(
      this.telegramLoginNoncesRepository.create({
        startTokenHash: hashTelegramLoginToken(startToken),
        pollTokenHash: hashTelegramLoginToken(pollToken),
        requestedUserId: currentUser?.id ?? null,
        status: "pending",
        expiresAt,
      }),
    );

    return {
      loginId: nonce.id,
      pollToken,
      botUrl: `https://t.me/${botUsername}?start=login_${startToken}`,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async getTelegramLoginStatus(input: {
    loginId: string;
    pollToken: string;
  }): Promise<
    | { status: "pending" | "expired" | "consumed"; expiresAt?: string }
    | ({ status: "confirmed" } & { accessToken: string; tokenType: "Bearer" })
  > {
    if (
      !this.telegramLoginNoncesRepository ||
      !this.telegramAccountsRepository ||
      !this.usersRepository
    ) {
      throw new ServiceUnavailableException("Telegram authorization storage is not configured");
    }

    const nonce = await this.telegramLoginNoncesRepository.findOne({ where: { id: input.loginId } });
    if (!nonce || !safeCompareHex(nonce.pollTokenHash, hashTelegramLoginToken(input.pollToken))) {
      throw new BadRequestException("Telegram login request not found");
    }

    if (nonce.expiresAt <= new Date() && nonce.status === "pending") {
      return { status: "expired" };
    }

    if (nonce.status === "pending") {
      return { status: "pending", expiresAt: nonce.expiresAt.toISOString() };
    }

    if (nonce.status === "consumed" || !nonce.confirmedUserId) {
      return { status: "consumed" };
    }

    const user = await this.usersRepository.findOne({ where: { id: nonce.confirmedUserId } });
    if (!user) {
      throw new BadRequestException("Telegram login user not found");
    }

    const account = await this.telegramAccountsRepository.findOne({ where: { userId: user.id } });
    nonce.status = "consumed";
    nonce.consumedAt = new Date();
    await this.telegramLoginNoncesRepository.save(nonce);

    return {
      status: "confirmed",
      ...this.issueToken({
        sub: user.id,
        name: user.name,
        role: user.role,
        phone: user.phoneNumber ?? undefined,
        phoneVerified: user.phoneVerifiedAt !== null,
        email: user.email ?? undefined,
        emailVerified: user.emailVerifiedAt !== null,
        telegram: account?.username ?? undefined,
        telegramVerified: true,
      }),
    };
  }

  async confirmTelegramLogin(
    input: {
      startParam: string;
      telegramId: string;
      username?: string;
      firstName?: string;
      lastName?: string;
      photoUrl?: string;
    },
    botAuthorization?: string,
  ): Promise<{ ok: true; linkedExistingUser: boolean }> {
    if (
      !this.telegramLoginNoncesRepository ||
      !this.telegramAccountsRepository ||
      !this.usersRepository
    ) {
      throw new ServiceUnavailableException("Telegram authorization storage is not configured");
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken || botToken === "replace-with-telegram-bot-token") {
      throw new BadRequestException("Telegram bot token is not configured");
    }

    if (botAuthorization !== `Bearer ${botToken}`) {
      throw new BadRequestException("Invalid bot authorization");
    }

    const telegramId = input.telegramId.trim();
    if (!telegramId || !/^\d+$/.test(telegramId)) {
      throw new BadRequestException("Telegram user id is required");
    }

    const startToken = parseTelegramStartToken(input.startParam);
    if (!/^[A-Za-z0-9_-]{20,64}$/.test(startToken)) {
      throw new BadRequestException("Invalid Telegram login token");
    }

    const nonce = await this.telegramLoginNoncesRepository.findOne({
      where: {
        startTokenHash: hashTelegramLoginToken(startToken),
        status: "pending",
      },
    });
    if (!nonce || nonce.expiresAt <= new Date()) {
      throw new BadRequestException("Telegram login request expired");
    }

    const requestedUser = nonce.requestedUserId
      ? await this.usersRepository.findOne({ where: { id: nonce.requestedUserId } })
      : null;
    let account = await this.telegramAccountsRepository.findOne({
      where: { telegramId },
      relations: { user: true },
    });

    if (requestedUser && account && account.userId !== requestedUser.id) {
      throw new BadRequestException("Этот Telegram уже привязан к другому аккаунту");
    }

    const displayName = compactName([input.firstName, input.lastName]) || input.username || "Пользователь";
    const username = input.username?.trim().replace(/^@/, "") || null;
    const photoUrl = input.photoUrl?.trim() || null;

    let user = requestedUser ?? account?.user ?? null;
    if (!user) {
      user = await this.usersRepository.save(
        this.usersRepository.create({
          id: stableTelegramUserId(telegramId),
          name: displayName,
          email: null,
          emailVerifiedAt: null,
          role: "user",
          phoneNumber: null,
          phoneVerifiedAt: null,
          avatarUrl: photoUrl,
        }),
      );
    } else {
      if (!user.name?.trim()) {
        user.name = displayName;
      }
      if (photoUrl && !user.avatarUrl) {
        user.avatarUrl = photoUrl;
      }
      user = await this.usersRepository.save(user);
    }

    if (!account) {
      account = this.telegramAccountsRepository.create({
        telegramId,
        user,
        userId: user.id,
      });
    }

    account.username = username;
    account.firstName = input.firstName?.trim() || null;
    account.lastName = input.lastName?.trim() || null;
    account.photoUrl = photoUrl;
    account.user = user;
    account.userId = user.id;
    await this.telegramAccountsRepository.save(account);

    nonce.status = "confirmed";
    nonce.confirmedUserId = user.id;
    nonce.confirmedAt = new Date();
    await this.telegramLoginNoncesRepository.save(nonce);

    return { ok: true, linkedExistingUser: Boolean(requestedUser) };
  }

  private async findCurrentUser(authorizationHeader?: string): Promise<UserEntity | null> {
    const token = authorizationHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token || !this.usersRepository) return null;

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET ?? "local-development-secret");
      if (typeof payload === "string" || typeof payload.sub !== "string") {
        return null;
      }
      return this.usersRepository.findOne({ where: { id: payload.sub } });
    } catch {
      return null;
    }
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
    const html = `<p>Ваш код входа в BikeTrips:</p><p><strong>${code}</strong></p><p>Он действует ${EMAIL_CODE_TTL_MINUTES} минут.</p>`;
    const apiKey = process.env.UNISENDER_API_KEY?.trim() || process.env.SMTP_PASSWORD?.trim();

    if (apiKey) {
      await this.deliverEmailCodeWithUnisenderApi(email, {
        subject,
        text,
        html,
        apiKey,
      });
      return "email";
    }

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
        html,
      });
      return "email";
    } catch {
      throw new ServiceUnavailableException("Не удалось отправить код входа");
    }
  }

  private async deliverEmailCodeWithUnisenderApi(
    email: string,
    input: { subject: string; text: string; html: string; apiKey: string },
  ): Promise<void> {
    const from = parseEmailFrom(process.env.EMAIL_FROM ?? "BikeTrips <no-reply@biketrips.local>");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(process.env.UNISENDER_API_URL ?? DEFAULT_UNISENDER_API_URL, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "X-API-KEY": input.apiKey,
        },
        body: JSON.stringify({
          message: {
            recipients: [{ email }],
            body: {
              html: input.html,
              plaintext: input.text,
            },
            subject: input.subject,
            from_email: from.email,
            from_name: from.name,
          },
        }),
        signal: controller.signal,
      });
      const result = await response.json().catch(() => null) as
        | { status?: string; message?: string; failed_emails?: unknown[] }
        | null;

      if (!response.ok || result?.status === "error" || (result?.failed_emails?.length ?? 0) > 0) {
        console.error("[BikeTrips] UniSender email delivery failed", {
          statusCode: response.status,
          status: result?.status,
          message: result?.message,
          failedEmails: result?.failed_emails,
        });
        throw new ServiceUnavailableException("Не удалось отправить код входа");
      }
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      console.error("[BikeTrips] UniSender email delivery request failed", error);
      throw new ServiceUnavailableException("Не удалось отправить код входа");
    } finally {
      clearTimeout(timeout);
    }
  }
}
