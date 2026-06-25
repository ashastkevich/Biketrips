import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { TripParticipantEntity } from "../../infrastructure/database/entities/trip-participant.entity.js";
import { TripEntity } from "../../infrastructure/database/entities/trip.entity.js";
import { WaitlistEntryEntity } from "../../infrastructure/database/entities/waitlist-entry.entity.js";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { ParticipantsService } from "./participants.service.js";

@Module({
  imports: [TypeOrmModule.forFeature([TripEntity, TripParticipantEntity, WaitlistEntryEntity]), NotificationsModule],
  providers: [ParticipantsService],
  exports: [ParticipantsService],
})
export class ParticipantsModule {}
