import { Module } from "@nestjs/common";

import { TelegramController } from "./telegram.controller.js";

@Module({
  controllers: [TelegramController],
})
export class TelegramModule {}
