import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, Repository } from "typeorm";
import type { TripStatus } from "@biketrips/domain";

import { TripEntity } from "../../infrastructure/database/entities/trip.entity.js";
import { TripUpdateEntity } from "../../infrastructure/database/entities/trip-update.entity.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import type { CreateTripDto, TripFiltersDto, UpdateTripDto } from "./dto/trip.dto.js";

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(TripEntity)
    private readonly tripsRepository: Repository<TripEntity>,
    @InjectRepository(TripUpdateEntity)
    private readonly tripUpdatesRepository: Repository<TripUpdateEntity>,
    private readonly notificationsService: NotificationsService
  ) {}

  async list(filters: TripFiltersDto): Promise<TripEntity[]> {
    const query = this.tripsRepository
      .createQueryBuilder("trip")
      .leftJoinAndSelect("trip.city", "city")
      .leftJoinAndSelect("trip.organizer", "organizer")
      .leftJoinAndSelect("trip.participants", "participants")
      .orderBy("trip.startAt", "ASC");

    if (filters.includeDrafts !== "true") {
      query.andWhere("trip.status = :status", { status: "published" });
    }

    if (filters.city) {
      query.andWhere(
        new Brackets((builder) => {
          builder
            .where("city.slug = :city", { city: filters.city })
      .orWhere("city.name ILIKE :cityName", { cityName: `%${filters.city}%` });
        })
      );
    }

    if (filters.difficulty) {
      query.andWhere("trip.difficulty = :difficulty", { difficulty: filters.difficulty });
    }

    if (filters.bikeType) {
      query.andWhere("trip.bikeTypes LIKE :bikeType", { bikeType: `%${filters.bikeType}%` });
    }

    if (filters.dateFrom) {
      query.andWhere("trip.startAt >= :dateFrom", { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      query.andWhere("trip.startAt <= :dateTo", { dateTo: filters.dateTo });
    }

    return query.getMany();
  }

  async getBySlugOrId(slugOrId: string): Promise<TripEntity> {
    const trip = await this.tripsRepository.findOne({
      where: [{ id: slugOrId }, { publicSlug: slugOrId }],
      relations: {
        city: true,
        organizer: true,
        participants: { user: true },
        waitlistEntries: { user: true },
        updates: true,
        routeFiles: true,
      },
      order: {
        updates: { createdAt: "DESC" },
        waitlistEntries: { position: "ASC" },
      },
    });

    if (!trip) {
      throw new NotFoundException("Trip not found");
    }

    return trip;
  }

  async create(dto: CreateTripDto): Promise<TripEntity> {
    const trip = this.tripsRepository.create({
      ...this.mapWritableFields(dto),
      status: "draft",
      publicSlug: await this.createUniqueSlug(dto.title),
    });

    return this.tripsRepository.save(trip);
  }

  async update(id: string, dto: UpdateTripDto): Promise<TripEntity> {
    const trip = await this.getBySlugOrId(id);
    Object.assign(trip, this.mapUpdateFields(dto), dto.status ? { status: dto.status } : {});
    return this.tripsRepository.save(trip);
  }

  async transition(id: string, status: Extract<TripStatus, "published" | "cancelled" | "finished">): Promise<TripEntity> {
    const trip = await this.getBySlugOrId(id);
    trip.status = status;
    const savedTrip = await this.tripsRepository.save(trip);

    if (status === "published" || status === "cancelled") {
      await this.tripUpdatesRepository.save(
        this.tripUpdatesRepository.create({
          tripId: savedTrip.id,
          title: status === "published" ? "Поездка опубликована" : "Поездка отменена",
          body:
            status === "published"
              ? "Организатор открыл запись на поездку."
              : "Организатор отменил поездку.",
        })
      );
      await this.notificationsService.enqueueTripStatusNotification(savedTrip, status);
    }

    return savedTrip;
  }

  private mapWritableFields(dto: CreateTripDto): Partial<TripEntity> {
    return {
      title: dto.title,
      description: dto.description,
      startAt: new Date(dto.startAt),
      startLocationName: dto.startLocationName,
      startLat: dto.startLat === undefined ? null : String(dto.startLat),
      startLng: dto.startLng === undefined ? null : String(dto.startLng),
      distanceKm: String(dto.distanceKm),
      paceMin: dto.paceMin ?? null,
      paceMax: dto.paceMax ?? null,
      difficulty: dto.difficulty,
      bikeTypes: dto.bikeTypes,
      surfaceTypes: dto.surfaceTypes,
      format: dto.format,
      routeDescription: dto.routeDescription ?? null,
      equipmentRequirements: dto.equipmentRequirements ?? null,
      rules: dto.rules ?? null,
      maxParticipants: dto.maxParticipants,
      registrationMode: dto.registrationMode ?? "automatic",
      organizerId: dto.organizerId,
      cityId: dto.cityId,
    };
  }

  private mapUpdateFields(dto: UpdateTripDto): Partial<TripEntity> {
    const update: Partial<TripEntity> = {};

    if (dto.title !== undefined) update.title = dto.title;
    if (dto.description !== undefined) update.description = dto.description;
    if (dto.startAt !== undefined) update.startAt = new Date(dto.startAt);
    if (dto.startLocationName !== undefined) update.startLocationName = dto.startLocationName;
    if (dto.startLat !== undefined) update.startLat = String(dto.startLat);
    if (dto.startLng !== undefined) update.startLng = String(dto.startLng);
    if (dto.distanceKm !== undefined) update.distanceKm = String(dto.distanceKm);
    if (dto.paceMin !== undefined) update.paceMin = dto.paceMin;
    if (dto.paceMax !== undefined) update.paceMax = dto.paceMax;
    if (dto.difficulty !== undefined) update.difficulty = dto.difficulty;
    if (dto.bikeTypes !== undefined) update.bikeTypes = dto.bikeTypes;
    if (dto.surfaceTypes !== undefined) update.surfaceTypes = dto.surfaceTypes;
    if (dto.format !== undefined) update.format = dto.format;
    if (dto.routeDescription !== undefined) update.routeDescription = dto.routeDescription;
    if (dto.equipmentRequirements !== undefined) update.equipmentRequirements = dto.equipmentRequirements;
    if (dto.rules !== undefined) update.rules = dto.rules;
    if (dto.maxParticipants !== undefined) update.maxParticipants = dto.maxParticipants;
    if (dto.registrationMode !== undefined) update.registrationMode = dto.registrationMode;
    if (dto.organizerId !== undefined) update.organizerId = dto.organizerId;
    if (dto.cityId !== undefined) update.cityId = dto.cityId;

    return update;
  }

  private async createUniqueSlug(title: string): Promise<string> {
    const baseSlug = title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9а-яё]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72);
    const fallbackSlug = `trip-${Date.now()}`;
    const slug = baseSlug || fallbackSlug;
    let candidate = slug;
    let suffix = 2;

    while (await this.tripsRepository.exists({ where: { publicSlug: candidate } })) {
      candidate = `${slug}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }
}
