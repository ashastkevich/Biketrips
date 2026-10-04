import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { NotificationJobEntity } from "../../infrastructure/database/entities/notification-job.entity.js";
import { UserEntity } from "../../infrastructure/database/entities/user.entity.js";
import { NotificationsService } from "./notifications.service.js";
import { NotificationsController } from "./notifications.controller.js";

@Module({
  imports: [TypeOrmModule.forFeature([NotificationJobEntity, UserEntity])],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
