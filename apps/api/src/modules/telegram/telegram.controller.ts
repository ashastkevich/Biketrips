import { Body, Controller, Get, Headers, Inject, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { AuthService } from "../auth/auth.service.js";

interface TelegramWebhookUpdate {
  message?: {
    text?: string;
    chat?: { id?: number };
    from?: {
      id?: number;
      is_bot?: boolean;
      first_name?: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
    };
  };
}

@ApiTags("telegram")
@Controller("telegram")
export class TelegramController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Get("status")
  status() {
    return {
      status: "configured",
      hasBotToken: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    };
  }

  @Post("webhook")
  async webhook(
    @Body() update: TelegramWebhookUpdate,
    @Headers("x-telegram-bot-api-secret-token") secretToken?: string,
  ) {
    const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
    if (configuredSecret && secretToken !== configuredSecret) {
      return { ok: false };
    }

    const message = update.message;
    const from = message?.from;
    const startParam = message?.text?.trim().match(/^\/start(?:@\w+)?\s+(login_[A-Za-z0-9_-]{20,64})$/)?.[1];

    if (!message?.chat?.id || !from?.id || from.is_bot || !startParam) {
      return { ok: true };
    }

    const response = await this.authService.confirmTelegramLogin(
      {
        startParam,
        telegramId: String(from.id),
        username: from.username,
        firstName: from.first_name,
        lastName: from.last_name,
        photoUrl: from.photo_url,
      },
      `Bearer ${process.env.TELEGRAM_BOT_TOKEN ?? ""}`,
    ).then(
      () => "Готово: Telegram подтверждён. Вернитесь на сайт BikeTrips.",
      (error: unknown) =>
        error instanceof Error
          ? error.message
          : "Не удалось подтвердить вход. Вернитесь на сайт и попробуйте ещё раз.",
    );

    return {
      method: "sendMessage",
      chat_id: message.chat.id,
      text: response,
      disable_web_page_preview: true,
    };
  }
}
