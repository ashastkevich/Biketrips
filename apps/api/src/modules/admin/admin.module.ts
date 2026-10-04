import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { TripsModule } from "../trips/trips.module.js";
import { AdminController } from "./admin.controller.js";
import { HealthController } from "./health.controller.js";

@Module({
  imports: [AuthModule, TripsModule],
  controllers: [AdminController, HealthController],
})
export class AdminModule {}
