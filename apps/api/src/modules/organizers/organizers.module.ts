import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { OrganizerEntity } from "../../infrastructure/database/entities/organizer.entity.js";
import { TripEntity } from "../../infrastructure/database/entities/trip.entity.js";
import { OrganizersController } from "./organizers.controller.js";
import { OrganizersService } from "./organizers.service.js";

@Module({
  imports: [TypeOrmModule.forFeature([OrganizerEntity, TripEntity])],
  controllers: [OrganizersController],
  providers: [OrganizersService],
})
export class OrganizersModule {}
