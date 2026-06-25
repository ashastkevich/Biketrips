import { Module } from "@nestjs/common";

import { AdminController } from "./admin.controller.js";
import { HealthController } from "./health.controller.js";

@Module({
  controllers: [AdminController, HealthController],
})
export class AdminModule {}
