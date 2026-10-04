import { Body, Controller, Headers, Param, Post, UnauthorizedException } from "@nestjs/common";
import { IsBoolean } from "class-validator";

import { NotificationsService } from "./notifications.service.js";

class CompleteNotificationDto {
  @IsBoolean()
  successful!: boolean;
}

@Controller("internal/notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post("claim")
  async claim(@Headers("authorization") authorization?: string) {
    this.assertWorker(authorization);
    return this.notificationsService.claimNext();
  }

  @Post(":id/complete")
  async complete(
    @Param("id") id: string,
    @Body() body: CompleteNotificationDto,
    @Headers("authorization") authorization?: string,
  ) {
    this.assertWorker(authorization);
    await this.notificationsService.complete(id, body.successful);
    return { ok: true };
  }

  private assertWorker(authorization?: string): void {
    const expected = process.env.TELEGRAM_BOT_TOKEN;
    if (!expected || authorization !== `Bearer ${expected}`) {
      throw new UnauthorizedException("Notification worker access is required");
    }
  }
}
