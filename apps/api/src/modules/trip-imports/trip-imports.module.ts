import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ImportSourceEntity } from "../../infrastructure/database/entities/import-source.entity.js";
import { ImportedPostEntity } from "../../infrastructure/database/entities/imported-post.entity.js";
import { AuthModule } from "../auth/auth.module.js";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { OrganizersModule } from "../organizers/organizers.module.js";
import { TripsModule } from "../trips/trips.module.js";
import { TelegramClaudeImportGateway, TripImportGateway } from "./trip-import.gateway.js";
import { TripImportsController } from "./trip-imports.controller.js";
import { TripImportsScheduler } from "./trip-imports.scheduler.js";
import { TripImportsService } from "./trip-imports.service.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([ImportSourceEntity, ImportedPostEntity]),
    AuthModule,
    NotificationsModule,
    OrganizersModule,
    TripsModule,
  ],
  controllers: [TripImportsController],
  providers: [
    TripImportsService,
    TripImportsScheduler,
    { provide: TripImportGateway, useClass: TelegramClaudeImportGateway },
  ],
})
export class TripImportsModule {}
