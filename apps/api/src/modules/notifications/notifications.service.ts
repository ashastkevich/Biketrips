import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, LessThanOrEqual, Not, IsNull, Repository } from "typeorm";

import type { ParticipantStatus } from "@biketrips/domain";

import {
  NotificationJobEntity,
  type NotificationJobType,
} from "../../infrastructure/database/entities/notification-job.entity.js";
import { TripParticipantEntity } from "../../infrastructure/database/entities/trip-participant.entity.js";
import { UserEntity } from "../../infrastructure/database/entities/user.entity.js";
import type { TripEntity } from "../../infrastructure/database/entities/trip.entity.js";
import type { WaitlistEntryEntity } from "../../infrastructure/database/entities/waitlist-entry.entity.js";
import { diffTripKeyFields, snapshotTripKeyFields, type TripKeySnapshot } from "./trip-key-changes.js";

type NotificationChannel = NotificationJobEntity["channel"];

interface ContactableUser {
  email: string | null;
  emailVerifiedAt: Date | null;
  telegramAccounts?: { telegramId: string }[];
}

const hourMs = 60 * 60 * 1000;
const keyChangesDebounceMs = 10 * 60 * 1000;
const retryDelaysMinutes = [1, 5, 30];
const defaultTimezone = "Europe/Moscow";
const activeParticipantStatuses: ParticipantStatus[] = ["confirmed", "pending", "waitlisted"];

// Participant-facing jobs are dropped at send time when the registration no longer matches them.
const expectedParticipantStatus: Partial<Record<NotificationJobType, ParticipantStatus[]>> = {
  registration_confirmed: ["confirmed"],
  registration_waitlisted: ["waitlisted"],
  registration_pending: ["pending"],
  registration_approved: ["confirmed"],
  registration_declined: ["cancelled"],
  participant_promoted: ["confirmed"],
  trip_updated: activeParticipantStatuses,
};

/** Telegram when linked, otherwise verified email; critical notifications go to every channel. */
export function resolveChannels(user: ContactableUser, critical: boolean): NotificationChannel[] {
  const hasTelegram = (user.telegramAccounts?.length ?? 0) > 0;
  const hasEmail = Boolean(user.email && user.emailVerifiedAt);
  if (critical) {
    return [
      ...(hasTelegram ? ["telegram" as const] : []),
      ...(hasEmail ? ["email" as const] : []),
    ];
  }
  if (hasTelegram) return ["telegram"];
  return hasEmail ? ["email"] : [];
}

function startsWithin(startAt: Date | string, windowMs: number, now = Date.now()): boolean {
  return new Date(startAt).getTime() - now < windowMs;
}

function tripPayload(trip: TripEntity): Record<string, unknown> {
  return {
    title: trip.title,
    publicSlug: trip.publicSlug,
    startAt: new Date(trip.startAt).toISOString(),
    startLocationName: trip.startLocationName,
    timezone: trip.city?.timezone ?? defaultTimezone,
  };
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationJobEntity)
    private readonly jobsRepository: Repository<NotificationJobEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(TripParticipantEntity)
    private readonly participantsRepository: Repository<TripParticipantEntity>,
  ) {}

  /** P1-P3: the participant's own registration result. */
  async enqueueRegistration(
    trip: TripEntity,
    participant: TripParticipantEntity,
    waitlistPosition: number | null = null,
  ): Promise<void> {
    const type = participant.status === "waitlisted"
      ? "registration_waitlisted"
      : participant.status === "pending"
        ? "registration_pending"
        : "registration_confirmed";
    await this.enqueueForUser(participant.userId, false, {
      type,
      tripId: trip.id,
      payload: { ...tripPayload(trip), waitlistPosition },
    });
  }

  /** P4-P5: the organizer approved or declined a registration. */
  async enqueueRegistrationDecision(
    trip: TripEntity,
    participant: TripParticipantEntity,
    decision: "approved" | "declined",
  ): Promise<void> {
    await this.enqueueForUser(
      participant.userId,
      decision === "approved" && startsWithin(trip.startAt, 24 * hourMs),
      {
        type: decision === "approved" ? "registration_approved" : "registration_declined",
        tripId: trip.id,
        payload: tripPayload(trip),
      },
    );
  }

  /** P6: a waitlisted participant got a place. */
  async enqueueParticipantPromoted(waitlistEntry: WaitlistEntryEntity, trip: TripEntity): Promise<void> {
    await this.enqueueForUser(waitlistEntry.userId, startsWithin(trip.startAt, 24 * hourMs), {
      type: "participant_promoted",
      tripId: waitlistEntry.tripId,
      payload: {
        ...tripPayload(trip),
        waitlistEntryId: waitlistEntry.id,
        position: waitlistEntry.position,
      },
    });
  }

  /** P7: notify every active participant on all channels. */
  async enqueueTripCancelled(trip: TripEntity): Promise<void> {
    await this.jobsRepository.update(
      { tripId: trip.id, type: "trip_updated", status: "queued" },
      { status: "skipped" },
    );
    const recipients = await this.findTripRecipients(trip);
    const jobs = recipients.flatMap((participant) =>
      resolveChannels(participant.user, true).map((channel) =>
        this.jobsRepository.create({
          channel,
          type: "trip_cancelled",
          recipientUserId: participant.userId,
          tripId: trip.id,
          payload: tripPayload(trip),
        }),
      ),
    );
    if (jobs.length > 0) await this.jobsRepository.save(jobs);
  }

  /**
   * P8: tell participants about changed key fields. Edits within the debounce window collapse into
   * one message whose diff is computed from the state before the first edit.
   */
  async enqueueTripKeyChanges(trip: TripEntity, before: TripKeySnapshot): Promise<void> {
    const after = snapshotTripKeyFields(trip);
    const queued = await this.jobsRepository.find({
      where: { tripId: trip.id, type: "trip_updated", status: "queued" },
    });
    if (queued.length === 0 && diffTripKeyFields(before, after).length === 0) return;

    const critical = startsWithin(before.startAt, 48 * hourMs) || startsWithin(after.startAt, 48 * hourMs);
    const runAt = new Date(Date.now() + keyChangesDebounceMs);
    const pending = new Map(queued.map((job) => [`${job.recipientUserId}:${job.channel}`, job]));
    const jobs: NotificationJobEntity[] = [];

    for (const participant of await this.findTripRecipients(trip)) {
      for (const channel of resolveChannels(participant.user, critical)) {
        const key = `${participant.userId}:${channel}`;
        const existing = pending.get(key);
        pending.delete(key);
        const baseline = (existing?.payload.before as TripKeySnapshot | undefined) ?? before;
        const changes = diffTripKeyFields(baseline, after);

        if (existing) {
          if (changes.length === 0) {
            existing.status = "skipped";
          } else {
            existing.payload = { ...tripPayload(trip), before: baseline, changes };
            existing.runAt = runAt;
          }
          jobs.push(existing);
        } else if (changes.length > 0) {
          jobs.push(this.jobsRepository.create({
            channel,
            type: "trip_updated",
            recipientUserId: participant.userId,
            tripId: trip.id,
            payload: { ...tripPayload(trip), before: baseline, changes },
            runAt,
          }));
        }
      }
    }
    // Leftovers belong to participants who left or channels no longer used for this change.
    for (const job of pending.values()) {
      job.status = "skipped";
      jobs.push(job);
    }
    if (jobs.length > 0) await this.jobsRepository.save(jobs);
  }

  /** O1/O2: tell the organizer about a new registration. */
  async enqueueParticipantJoined(
    trip: TripEntity,
    participant: TripParticipantEntity,
  ): Promise<void> {
    await this.enqueueForUser(trip.organizer.userId, false, {
      type: "participant_joined",
      tripId: trip.id,
      payload: {
        title: trip.title,
        publicSlug: trip.publicSlug,
        participantName: participant.name,
        participantStatus: participant.status,
      },
    });
  }

  async enqueueModerationSubmitted(trip: TripEntity): Promise<void> {
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
    // Imported trips belong to a channel's system user, who has nowhere to receive messages.
    if (trip.source !== "native") return;
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

  private async enqueueForUser(
    userId: string,
    critical: boolean,
    job: { type: NotificationJobType; tripId: string; payload: Record<string, unknown> },
  ): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: { telegramAccounts: true },
    });
    if (!user) return;
    const jobs = resolveChannels(user, critical).map((channel) =>
      this.jobsRepository.create({ ...job, channel, recipientUserId: userId }),
    );
    if (jobs.length > 0) await this.jobsRepository.save(jobs);
  }

  private async findTripRecipients(trip: TripEntity): Promise<TripParticipantEntity[]> {
    const participants = await this.participantsRepository.find({
      where: { tripId: trip.id, status: In(activeParticipantStatuses) },
      relations: { user: { telegramAccounts: true } },
    });
    return participants.filter((participant) => participant.userId !== trip.organizer?.userId);
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
    channel: NotificationChannel;
    type: NotificationJobType;
    payload: Record<string, unknown>;
    destination: string;
  } | null> {
    // Skipped jobs do not count as a delivery, so keep looking for a sendable one.
    for (let checked = 0; checked < 20; checked += 1) {
      const job = await this.jobsRepository.findOne({
        where: {
          status: "queued",
          runAt: LessThanOrEqual(new Date()),
          recipientUserId: Not(IsNull()),
        },
        order: { runAt: "ASC", createdAt: "ASC" },
      });
      if (!job?.recipientUserId) return null;

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

      if (!destination || !(await this.isStillRelevant(job))) {
        job.status = "skipped";
        await this.jobsRepository.save(job);
        continue;
      }

      return {
        id: job.id,
        channel: job.channel,
        type: job.type,
        payload: job.payload,
        destination,
      };
    }
    return null;
  }

  async complete(id: string, successful: boolean): Promise<void> {
    const job = await this.jobsRepository.findOne({ where: { id, status: "processing" } });
    if (!job) return;

    if (successful) {
      job.status = "sent";
    } else {
      job.attempts += 1;
      const retryDelay = retryDelaysMinutes[job.attempts - 1];
      if (retryDelay === undefined) {
        job.status = "failed";
      } else {
        job.status = "queued";
        job.runAt = new Date(Date.now() + retryDelay * 60 * 1000);
      }
    }
    await this.jobsRepository.save(job);
  }

  private async isStillRelevant(job: NotificationJobEntity): Promise<boolean> {
    const expectedStatuses = expectedParticipantStatus[job.type];
    if (!expectedStatuses || !job.tripId || !job.recipientUserId) return true;

    const participant = await this.participantsRepository.findOne({
      where: { tripId: job.tripId, userId: job.recipientUserId },
      relations: { trip: true },
    });
    if (!participant?.trip) return false;
    if (participant.trip.status !== "published") return false;
    if (new Date(participant.trip.startAt).getTime() <= Date.now()) return false;
    return expectedStatuses.includes(participant.status);
  }
}
