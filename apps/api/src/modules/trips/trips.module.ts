import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { TripEntity } from "../../infrastructure/database/entities/trip.entity.js";
import { TripUpdateEntity } from "../../infrastructure/database/entities/trip-update.entity.js";
import { OrganizerEntity } from "../../infrastructure/database/entities/organizer.entity.js";
import { UserEntity } from "../../infrastructure/database/entities/user.entity.js";
import { CityEntity } from "../../infrastructure/database/entities/city.entity.js";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { ParticipantsModule } from "../participants/participants.module.js";
import { TripsController } from "./trips.controller.js";
import { TripsService } from "./trips.service.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([TripEntity, TripUpdateEntity, OrganizerEntity, UserEntity, CityEntity]),
    NotificationsModule,
    ParticipantsModule,
  ],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
