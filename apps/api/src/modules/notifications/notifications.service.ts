import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThanOrEqual, Not, IsNull, Repository } from "typeorm";

import { NotificationJobEntity } from "../../infrastructure/database/entities/notification-job.entity.js";
import { UserEntity } from "../../infrastructure/database/entities/user.entity.js";
import type { TripEntity } from "../../infrastructure/database/entities/trip.entity.js";
import type { WaitlistEntryEntity } from "../../infrastructure/database/entities/waitlist-entry.entity.js";

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationJobEntity)
    private readonly jobsRepository: Repository<NotificationJobEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository?: Repository<UserEntity>,
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

  async enqueueTripUpdatedNotification(trip: TripEntity): Promise<void> {
    await this.jobsRepository.save(
      this.jobsRepository.create({
        channel: "telegram",
        type: "trip_updated",
        tripId: trip.id,
        payload: {
          title: trip.title,
          publicSlug: trip.publicSlug,
        },
      }),
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

  async enqueueModerationSubmitted(trip: TripEntity): Promise<void> {
    if (!this.usersRepository) return;
    const admins = await this.usersRepository.find({ where: { role: "admin" } });
    await Promise.all(
      admins.map((admin) =>
        this.enqueueOnce({
          channel: "telegram",
          type: "moderation_submitted",
          recipientUserId: admin.id,
          tripId: trip.id,
          payload: {
            title: trip.title,
            publicSlug: trip.publicSlug,
          },
        }),
      ),
    );
  }

  async enqueueModerationDecision(
    trip: TripEntity,
    decision: "approve" | "request_changes" | "reject",
  ): Promise<void> {
    const type = decision === "approve"
      ? "trip_approved"
      : decision === "request_changes"
        ? "trip_changes_requested"
        : "trip_rejected";
    const payload = {
      title: trip.title,
      publicSlug: trip.publicSlug,
      comment: trip.moderationComment,
    };

    await Promise.all(
      (["telegram", "email"] as const).map((channel) =>
        this.jobsRepository.save(
          this.jobsRepository.create({
            channel,
            type,
            recipientUserId: trip.organizer.userId,
            tripId: trip.id,
            payload,
          }),
        ),
      ),
    );
  }

  private async enqueueOnce(input: Pick<
    NotificationJobEntity,
    "channel" | "type" | "payload"
  > & { recipientUserId: string; tripId: string }): Promise<void> {
    const existing = await this.jobsRepository.findOne({
      where: {
        channel: input.channel,
        type: input.type,
        recipientUserId: input.recipientUserId,
        tripId: input.tripId,
        status: "queued",
      },
    });
    if (existing) return;
    await this.jobsRepository.save(this.jobsRepository.create(input));
  }

  async claimNext(): Promise<{
    id: string;
    channel: "telegram" | "email";
    type: NotificationJobEntity["type"];
    payload: Record<string, unknown>;
    destination: string | null;
  } | null> {
    const job = await this.jobsRepository.findOne({
      where: {
        status: "queued",
        runAt: LessThanOrEqual(new Date()),
        recipientUserId: Not(IsNull()),
      },
      order: { createdAt: "ASC" },
    });
    if (!job || !job.recipientUserId || !this.usersRepository) return null;

    job.status = "processing";
    await this.jobsRepository.save(job);
    const user = await this.usersRepository.findOne({
      where: { id: job.recipientUserId },
      relations: { telegramAccounts: true },
    });
    const destination = job.channel === "telegram"
      ? user?.telegramAccounts?.[0]?.telegramId ?? null
      : user?.emailVerifiedAt && user.email
        ? user.email
        : null;

    return {
      id: job.id,
      channel: job.channel,
      type: job.type,
      payload: job.payload,
      destination,
    };
  }

  async complete(id: string, successful: boolean): Promise<void> {
    await this.jobsRepository.update(
      { id, status: "processing" },
      { status: successful ? "sent" : "failed" },
    );
  }
}
