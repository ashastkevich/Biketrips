import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { OrganizerEntity } from "../../infrastructure/database/entities/organizer.entity.js";
import { TelegramAccountEntity } from "../../infrastructure/database/entities/telegram-account.entity.js";
import { TripEntity } from "../../infrastructure/database/entities/trip.entity.js";
import { UserEntity } from "../../infrastructure/database/entities/user.entity.js";
import { ImportedOrganizersService } from "./imported-organizers.service.js";
import { OrganizersController } from "./organizers.controller.js";
import { OrganizersService } from "./organizers.service.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([OrganizerEntity, TelegramAccountEntity, TripEntity, UserEntity]),
  ],
  controllers: [OrganizersController],
  providers: [ImportedOrganizersService, OrganizersService],
  exports: [ImportedOrganizersService],
})
export class OrganizersModule {}
