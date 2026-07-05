import "reflect-metadata";

import { DataSource } from "typeorm";

import { CityEntity } from "./entities/city.entity.js";
import { NotificationJobEntity } from "./entities/notification-job.entity.js";
import { OrganizerEntity } from "./entities/organizer.entity.js";
import { RouteFileEntity } from "./entities/route-file.entity.js";
import { TelegramAccountEntity } from "./entities/telegram-account.entity.js";
import { TripParticipantEntity } from "./entities/trip-participant.entity.js";
import { TripUpdateEntity } from "./entities/trip-update.entity.js";
import { TripEntity } from "./entities/trip.entity.js";
import { UserEntity } from "./entities/user.entity.js";
import { WaitlistEntryEntity } from "./entities/waitlist-entry.entity.js";
import { CreateMvpBackendSchema1737400000000 } from "./migrations/1737400000000-CreateMvpBackendSchema.js";
import { AddUserAccessFields1737500000000 } from "./migrations/1737500000000-AddUserAccessFields.js";
import { AddSurfaceCompositionFields1737600000000 } from "./migrations/1737600000000-AddSurfaceCompositionFields.js";
import { DropLegacySurfaceType1737700000000 } from "./migrations/1737700000000-DropLegacySurfaceType.js";
import { AddTripCoverImage1737800000000 } from "./migrations/1737800000000-AddTripCoverImage.js";
import { MakeTripParticipantLimitOptional1737900000000 } from "./migrations/1737900000000-MakeTripParticipantLimitOptional.js";

export const appDataSource = new DataSource({
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
  migrations: [
    CreateMvpBackendSchema1737400000000,
    AddUserAccessFields1737500000000,
    AddSurfaceCompositionFields1737600000000,
    DropLegacySurfaceType1737700000000,
    AddTripCoverImage1737800000000,
    MakeTripParticipantLimitOptional1737900000000,
  ],
  synchronize: false,
});
