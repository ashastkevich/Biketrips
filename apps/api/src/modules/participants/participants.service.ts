import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, IsNull, Repository } from "typeorm";
import type { ParticipantStatus } from "@biketrips/domain";
import { isUUID } from "class-validator";

import { TripParticipantEntity } from "../../infrastructure/database/entities/trip-participant.entity.js";
import { TripEntity } from "../../infrastructure/database/entities/trip.entity.js";
import { WaitlistEntryEntity } from "../../infrastructure/database/entities/waitlist-entry.entity.js";
import { UserEntity } from "../../infrastructure/database/entities/user.entity.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import type { CreateParticipantDto } from "./dto/participant.dto.js";
import { decideRegistrationStatus } from "./registration-policy.js";

@Injectable()
export class ParticipantsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(TripEntity)
    private readonly tripsRepository: Repository<TripEntity>,
    @InjectRepository(TripParticipantEntity)
    private readonly participantsRepository: Repository<TripParticipantEntity>,
    @InjectRepository(WaitlistEntryEntity)
    private readonly waitlistRepository: Repository<WaitlistEntryEntity>,
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService
  ) {}

  async listForTrip(tripId: string): Promise<TripParticipantEntity[]> {
    return this.participantsRepository.find({
      where: { tripId },
      relations: { user: true },
      order: { createdAt: "ASC" },
    });
  }

  async joinTrip(tripId: string, dto: CreateParticipantDto): Promise<TripParticipantEntity> {
    if (!isUUID(tripId)) {
      throw new NotFoundException("Trip not found");
    }

    return this.dataSource.transaction(async (manager) => {
      let user = await manager.findOne(UserEntity, { where: { id: dto.userId } });
      if (!user) {
        user = await manager.save(
          manager.create(UserEntity, {
            id: dto.userId,
            name: dto.name,
            email: null,
            avatarUrl: null,
            role: "user",
            phoneNumber: null,
            phoneVerifiedAt: null,
          }),
        );
      }

      const trip = await manager.findOne(TripEntity, {
        where: { id: tripId },
        lock: { mode: "pessimistic_write" },
      });

      if (!trip) {
        throw new NotFoundException("Trip not found");
      }

      if (trip.status !== "published") {
        throw new BadRequestException("Trip is not open for registration");
      }

      const existing = await manager.findOne(TripParticipantEntity, {
        where: { tripId, userId: dto.userId },
      });

      if (existing && existing.status !== "cancelled") {
        throw new BadRequestException("User is already registered for this trip");
      }

      if (existing) {
        await manager.delete(WaitlistEntryEntity, { tripId, userId: dto.userId });
      }

      const confirmedParticipants = await manager.count(TripParticipantEntity, {
        where: { tripId, status: "confirmed" },
      });
      const status = decideRegistrationStatus({
        confirmedParticipants,
        capacity: trip.maxParticipants,
        registrationMode: trip.registrationMode,
      });
      const participant = manager.create(TripParticipantEntity, {
        id: existing?.id,
        tripId,
        userId: dto.userId,
        name: dto.name,
        telegramUsername: dto.telegramUsername ?? null,
        phone: dto.phone ?? null,
        comment: dto.comment ?? null,
        status,
      });
      const savedParticipant = await manager.save(participant);

      if (status === "waitlisted") {
        const position = await manager.count(WaitlistEntryEntity, { where: { tripId } });
        await manager.save(
          manager.create(WaitlistEntryEntity, {
            tripId,
            userId: dto.userId,
            position: position + 1,
          })
        );
      }

      return savedParticipant;
    });
  }

  async getForUser(
    tripId: string,
    userId: string,
  ): Promise<TripParticipantEntity | null> {
    if (!isUUID(tripId)) {
      return null;
    }

    return this.participantsRepository.findOne({
      where: { tripId, userId },
    });
  }

  async cancelForUser(tripId: string, userId: string): Promise<TripParticipantEntity> {
    if (!isUUID(tripId)) {
      throw new NotFoundException("Active registration not found");
    }

    const participant = await this.getForUser(tripId, userId);

    if (!participant || participant.status === "cancelled") {
      throw new NotFoundException("Active registration not found");
    }

    const previousStatus = participant.status;
    participant.status = "cancelled";
    const savedParticipant = await this.participantsRepository.save(participant);

    await this.waitlistRepository.delete({ tripId, userId });
    if (previousStatus === "confirmed") {
      await this.promoteNextWaitlistParticipant(tripId);
    }

    return savedParticipant;
  }

  async updateStatus(
    tripId: string,
    participantId: string,
    status: ParticipantStatus
  ): Promise<TripParticipantEntity> {
    const participant = await this.participantsRepository.findOne({
      where: { id: participantId, tripId },
      relations: { trip: true },
    });

    if (!participant) {
      throw new NotFoundException("Participant not found");
    }

    participant.status = status;
    const savedParticipant = await this.participantsRepository.save(participant);

    if (status === "cancelled") {
      await this.promoteNextWaitlistParticipant(tripId);
    }

    return savedParticipant;
  }

  private async promoteNextWaitlistParticipant(tripId: string): Promise<void> {
    const trip = await this.tripsRepository.findOne({ where: { id: tripId } });

    if (!trip) {
      return;
    }

    const confirmedParticipants = await this.participantsRepository.count({
      where: { tripId, status: "confirmed" },
    });

    if (trip.maxParticipants !== null && confirmedParticipants >= trip.maxParticipants) {
      return;
    }

    const waitlistEntry = await this.waitlistRepository.findOne({
      where: { tripId, promotedAt: IsNull() },
      order: { position: "ASC" },
    });

    if (!waitlistEntry) {
      return;
    }

    await this.participantsRepository.update(
      { tripId, userId: waitlistEntry.userId },
      { status: "confirmed" }
    );
    waitlistEntry.promotedAt = new Date();
    await this.waitlistRepository.save(waitlistEntry);
    await this.notificationsService.enqueueParticipantPromoted(waitlistEntry);
  }
}
