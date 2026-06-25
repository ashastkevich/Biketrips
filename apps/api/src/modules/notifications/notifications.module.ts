import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { NotificationJobEntity } from "../../infrastructure/database/entities/notification-job.entity.js";
import { NotificationsService } from "./notifications.service.js";

@Module({
  imports: [TypeOrmModule.forFeature([NotificationJobEntity])],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
