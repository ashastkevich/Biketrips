import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AdminModule } from "./modules/admin/admin.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { NotificationsModule } from "./modules/notifications/notifications.module.js";
import { OrganizersModule } from "./modules/organizers/organizers.module.js";
import { ParticipantsModule } from "./modules/participants/participants.module.js";
import { TelegramModule } from "./modules/telegram/telegram.module.js";
import { TripsModule } from "./modules/trips/trips.module.js";
import { UsersModule } from "./modules/users/users.module.js";
import { CityEntity } from "./infrastructure/database/entities/city.entity.js";
import { NotificationJobEntity } from "./infrastructure/database/entities/notification-job.entity.js";
import { OrganizerEntity } from "./infrastructure/database/entities/organizer.entity.js";
import { RouteFileEntity } from "./infrastructure/database/entities/route-file.entity.js";
import { TelegramAccountEntity } from "./infrastructure/database/entities/telegram-account.entity.js";
import { TripEntity } from "./infrastructure/database/entities/trip.entity.js";
import { TripParticipantEntity } from "./infrastructure/database/entities/trip-participant.entity.js";
import { TripUpdateEntity } from "./infrastructure/database/entities/trip-update.entity.js";
import { UserEntity } from "./infrastructure/database/entities/user.entity.js";
import { WaitlistEntryEntity } from "./infrastructure/database/entities/waitlist-entry.entity.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: "postgres",
      url: process.env.DATABASE_URL ?? "postgres://biketrips:biketrips@localhost:5432/biketrips",
      entities: [
        CityEntity,
        NotificationJobEntity,
        OrganizerEntity,
        RouteFileEntity,
        TelegramAccountEntity,
        TripEntity,
        TripParticipantEntity,
        TripUpdateEntity,
        UserEntity,
        WaitlistEntryEntity,
      ],
      migrations: ["dist/infrastructure/database/migrations/*.js"],
      synchronize: false,
    }),
    AdminModule,
    AuthModule,
    NotificationsModule,
    OrganizersModule,
    ParticipantsModule,
    TelegramModule,
    TripsModule,
    UsersModule,
  ],
})
export class AppModule {}
