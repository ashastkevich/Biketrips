import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("telegram")
@Controller("telegram")
export class TelegramController {
  @Get("status")
  status() {
    return {
      status: "configured",
      hasBotToken: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    };
  }
}
