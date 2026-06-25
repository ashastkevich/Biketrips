import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { NotificationJobEntity } from "../../infrastructure/database/entities/notification-job.entity.js";
import type { TripEntity } from "../../infrastructure/database/entities/trip.entity.js";
import type { WaitlistEntryEntity } from "../../infrastructure/database/entities/waitlist-entry.entity.js";

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationJobEntity)
    private readonly jobsRepository: Repository<NotificationJobEntity>
  ) {}

  async enqueueTripStatusNotification(trip: TripEntity, status: "published" | "cancelled"): Promise<void> {
    await this.jobsRepository.save(
      this.jobsRepository.create({
        channel: "telegram",
        type: status === "published" ? "trip_published" : "trip_cancelled",
        tripId: trip.id,
        payload: {
          title: trip.title,
          publicSlug: trip.publicSlug,
          status,
        },
      })
    );
  }

  async enqueueParticipantPromoted(waitlistEntry: WaitlistEntryEntity): Promise<void> {
    await this.jobsRepository.save(
      this.jobsRepository.create({
        channel: "telegram",
        type: "participant_promoted",
        tripId: waitlistEntry.tripId,
        recipientUserId: waitlistEntry.userId,
        payload: {
          waitlistEntryId: waitlistEntry.id,
          position: waitlistEntry.position,
        },
      })
    );
  }
}
