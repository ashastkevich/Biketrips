import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "node:process";
import { setDefaultResultOrder } from "node:dns";

import { readOptionalEnv } from "@biketrips/config";

setDefaultResultOrder("ipv4first");

const currentDir = dirname(fileURLToPath(import.meta.url));
const envFiles = [
  resolve(currentDir, "../../../.env"),
  resolve(currentDir, "../.env"),
];

for (const envFile of envFiles) {
  if (existsSync(envFile)) {
    loadEnvFile(envFile);
  }
}

const apiUrl = readOptionalEnv(
  "API_INTERNAL_URL",
  readOptionalEnv("NEXT_PUBLIC_API_URL", "http://localhost:4000"),
).replace(/\/$/, "");
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const publicWebUrl = readOptionalEnv("PUBLIC_WEB_URL", "https://biketrips.ru").replace(/\/$/, "");
const defaultUnisenderApiUrl = "https://goapi.unisender.ru/ru/transactional/api/v1/email/send.json";

interface TelegramUpdate {
  update_id: number;
  message?: {
    text?: string;
    chat: { id: number };
    from?: {
      id: number;
      is_bot?: boolean;
      first_name?: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
    };
  };
}

interface TelegramResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
}

interface NotificationJob {
  id: string;
  channel: "telegram" | "email";
  type:
    | "moderation_submitted"
    | "trip_approved"
    | "trip_changes_requested"
    | "trip_rejected";
  destination: string | null;
  payload: Record<string, unknown>;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function telegramApiUrl(method: string): string {
  if (!botToken) {
    throw new Error("Missing required environment variable: TELEGRAM_BOT_TOKEN");
  }

  return `https://api.telegram.org/bot${botToken}/${method}`;
}

async function telegramRequest<T>(method: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(telegramApiUrl(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json() as TelegramResponse<T>;

  if (!response.ok || !result.ok) {
    throw new Error(result.description ?? `Telegram API request failed: ${response.status}`);
  }

  return result.result as T;
}

async function sendMessage(chatId: number, text: string): Promise<void> {
  await telegramRequest("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
}

async function getUpdates(offset: number | null): Promise<TelegramUpdate[]> {
  return telegramRequest<TelegramUpdate[]>("getUpdates", {
    ...(offset === null ? {} : { offset }),
    timeout: 30,
    allowed_updates: ["message"],
  });
}

async function confirmTelegramLogin(update: TelegramUpdate, startParam: string): Promise<void> {
  const message = update.message;
  const from = message?.from;

  if (!message || !from || from.is_bot) return;

  const response = await fetch(`${apiUrl}/auth/telegram/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${botToken}`,
    },
    body: JSON.stringify({
      startParam,
      telegramId: String(from.id),
      username: from.username,
      firstName: from.first_name,
      lastName: from.last_name,
      photoUrl: from.photo_url,
    }),
  }).catch(() => null);

  if (!response?.ok) {
    const result = await response?.json().catch(() => null) as { message?: string } | null;
    await sendMessage(
      message.chat.id,
      result?.message ?? "Не удалось подтвердить вход. Вернитесь на сайт и попробуйте ещё раз.",
    );
    return;
  }

  await sendMessage(message.chat.id, "Готово: Telegram подтверждён. Вернитесь на сайт BikeTrips.");
}

async function handleUpdate(update: TelegramUpdate): Promise<void> {
  const text = update.message?.text?.trim();
  const startParam = text?.match(/^\/start(?:@\w+)?\s+(login_[A-Za-z0-9_-]{20,64})$/)?.[1];

  if (!startParam) return;

  await confirmTelegramLogin(update, startParam);
}

function notificationText(job: NotificationJob): { subject: string; text: string } {
  const title = typeof job.payload.title === "string" ? job.payload.title : "Поездка";
  const slug = typeof job.payload.publicSlug === "string" ? job.payload.publicSlug : "";
  const comment = typeof job.payload.comment === "string" ? job.payload.comment : "";
  const tripUrl = slug ? `${publicWebUrl}/trips/${encodeURIComponent(slug)}` : publicWebUrl;

  if (job.type === "moderation_submitted") {
    return {
      subject: "Новая поездка на модерации",
      text: `Новая поездка «${title}» ожидает проверки.\n${publicWebUrl}/admin/moderation`,
    };
  }
  if (job.type === "trip_approved") {
    return {
      subject: "Поездка одобрена",
      text: `Поездка «${title}» одобрена и опубликована.\n${tripUrl}`,
    };
  }
  if (job.type === "trip_changes_requested") {
    return {
      subject: "Поездку нужно исправить",
      text: `Поездка «${title}» возвращена на исправление.\nКомментарий: ${comment}\n${publicWebUrl}/profile`,
    };
  }
  return {
    subject: "Поездка отклонена",
    text: `Поездка «${title}» отклонена.\nКомментарий: ${comment}\n${publicWebUrl}/profile`,
  };
}

async function claimNotification(): Promise<NotificationJob | null> {
  const response = await fetch(`${apiUrl}/internal/notifications/claim`, {
    method: "POST",
    headers: { Authorization: `Bearer ${botToken}` },
  });
  if (!response.ok) throw new Error(`Notification claim failed: ${response.status}`);
  return response.json() as Promise<NotificationJob | null>;
}

async function completeNotification(id: string, successful: boolean): Promise<void> {
  await fetch(`${apiUrl}/internal/notifications/${encodeURIComponent(id)}/complete`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ successful }),
  });
}

async function sendEmail(email: string, subject: string, text: string): Promise<void> {
  const apiKey = process.env.UNISENDER_API_KEY?.trim();
  const fromMatch = (process.env.EMAIL_FROM ?? "BikeTrips <no-reply@biketrips.ru>")
    .match(/^\s*(.*?)\s*<([^<>]+)>\s*$/);
  if (!apiKey || apiKey === "replace-with-unisender-api-key") {
    throw new Error("UNISENDER_API_KEY is not configured");
  }
  const response = await fetch(process.env.UNISENDER_API_URL ?? defaultUnisenderApiUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify({
      message: {
        recipients: [{ email }],
        body: { plaintext: text, html: `<p>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p>` },
        subject,
        from_email: fromMatch?.[2] ?? "no-reply@biketrips.ru",
        from_name: fromMatch?.[1] || "BikeTrips",
      },
    }),
  });
  if (!response.ok) throw new Error(`Email delivery failed: ${response.status}`);
}

async function processNotificationJobs(): Promise<void> {
  for (let processed = 0; processed < 10; processed += 1) {
    const job = await claimNotification();
    if (!job) return;
    let successful = false;
    try {
      if (!job.destination) throw new Error("Notification recipient is unavailable");
      const message = notificationText(job);
      if (job.channel === "telegram") {
        await sendMessage(Number(job.destination), message.text);
      } else {
        await sendEmail(job.destination, message.subject, message.text);
      }
      successful = true;
    } catch (error) {
      console.error("[BikeTrips] Notification delivery failed", error);
    } finally {
      await completeNotification(job.id, successful);
    }
  }
}

async function main(): Promise<void> {
  console.log("BikeTrips bot worker is starting.");
  console.log(`API endpoint: ${apiUrl}`);

  if (!botToken || botToken === "replace-with-telegram-bot-token") {
    console.log("Telegram bot token is not configured. Bot worker is idle.");
    return;
  }

  let offset: number | null = null;

  for (;;) {
    try {
      const updates = await getUpdates(offset);
      for (const update of updates) {
        offset = update.update_id + 1;
        await handleUpdate(update);
      }
      await processNotificationJobs();
    } catch (error) {
      console.error("[BikeTrips] Telegram bot polling failed", error);
      await delay(5000);
    }
  }
}

await main();
