import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import type { TripStatus } from "@biketrips/domain";

import { TripEntity } from "../../infrastructure/database/entities/trip.entity.js";
import { TripUpdateEntity } from "../../infrastructure/database/entities/trip-update.entity.js";
import { OrganizerEntity } from "../../infrastructure/database/entities/organizer.entity.js";
import { UserEntity } from "../../infrastructure/database/entities/user.entity.js";
import { CityEntity } from "../../infrastructure/database/entities/city.entity.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import type { CreateTripDto, TripFiltersDto, UpdateTripDto } from "./dto/trip.dto.js";

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(TripEntity)
    private readonly tripsRepository: Repository<TripEntity>,
    @InjectRepository(TripUpdateEntity)
    private readonly tripUpdatesRepository: Repository<TripUpdateEntity>,
    @InjectRepository(OrganizerEntity)
    private readonly organizersRepository: Repository<OrganizerEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(CityEntity)
    private readonly citiesRepository: Repository<CityEntity>,
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService
  ) {}

  async list(filters: TripFiltersDto): Promise<TripEntity[]> {
    const query = this.tripsRepository
      .createQueryBuilder("trip")
      .leftJoinAndSelect("trip.city", "city")
      .leftJoinAndSelect("trip.organizer", "organizer")
      .leftJoinAndSelect("organizer.user", "organizerUser")
      .leftJoinAndSelect("trip.participants", "participants")
      .orderBy("trip.startAt", "ASC");

    if (filters.includeDrafts !== "true") {
      query.andWhere("trip.status = :status", { status: "published" });
    }

    if (filters.city) {
      query.andWhere("city.slug = :city", { city: filters.city });
    }

    if (filters.difficulty) {
      query.andWhere("trip.difficulty = :difficulty", { difficulty: filters.difficulty });
    }

    if (filters.bikeType) {
      query.andWhere("trip.bikeType = :bikeType", { bikeType: filters.bikeType });
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
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        slugOrId,
      );
    const trip = await this.tripsRepository.findOne({
      where: isUuid ? { id: slugOrId } : { publicSlug: slugOrId },
      relations: {
        city: true,
        organizer: { user: true },
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

  async create(
    dto: CreateTripDto,
    actor: {
      id: string;
      name?: string;
      role: "user" | "admin";
      phone?: string;
      phoneVerified: boolean;
    },
  ): Promise<TripEntity> {
    this.validateSurfaceComposition(dto.asphaltPercent, dto.unpavedPercent);
    const cityExists = await this.citiesRepository.existsBy({ id: dto.cityId });
    if (!cityExists) {
      throw new BadRequestException("Unknown city");
    }
    const organizer = await this.getOrCreateOrganizer(actor);
    const trip = this.tripsRepository.create({
      ...this.mapWritableFields(dto),
      organizerId: organizer.id,
      status: "draft",
      publicSlug: await this.createUniqueSlug(dto.title),
    });

    const savedTrip = await this.tripsRepository.save(trip);
    return this.getBySlugOrId(savedTrip.id);
  }

  private async getOrCreateOrganizer(actor: {
    id: string;
    name?: string;
    role: "user" | "admin";
    phone?: string;
    phoneVerified: boolean;
  }): Promise<OrganizerEntity> {
    let user = await this.usersRepository.findOne({ where: { id: actor.id } });

    if (!user) {
      user = await this.usersRepository.save(
        this.usersRepository.create({
          id: actor.id,
          name: actor.name ?? "Организатор BikeTrips",
          email: null,
          role: actor.role,
          phoneNumber: actor.phone ?? null,
          phoneVerifiedAt: actor.phoneVerified ? new Date() : null,
          avatarUrl: null,
        }),
      );
    }

    const existingOrganizer = await this.organizersRepository.findOne({
      where: { userId: user.id },
    });
    if (existingOrganizer) return existingOrganizer;

    return this.organizersRepository.save(
      this.organizersRepository.create({
        userId: user.id,
        displayName: actor.name ?? user.name,
        bio: null,
        contactUrl: null,
        isVerified: false,
      }),
    );
  }

  async update(id: string, dto: UpdateTripDto): Promise<TripEntity> {
    const trip = await this.getBySlugOrId(id);
    this.validateSurfaceComposition(
      dto.asphaltPercent ?? trip.asphaltPercent,
      dto.unpavedPercent ?? trip.unpavedPercent
    );
    Object.assign(trip, this.mapUpdateFields(dto), dto.status ? { status: dto.status } : {});
    return this.tripsRepository.save(trip);
  }

  async transition(
    id: string,
    status: Extract<TripStatus, "published" | "cancelled" | "finished">,
    actor: { id: string; role: "user" | "admin" },
  ): Promise<TripEntity> {
    const trip = await this.getBySlugOrId(id);
    if (trip.organizer.userId !== actor.id && actor.role !== "admin") {
      throw new ForbiddenException("Only the trip organizer can change its status");
    }
    if (
      status === "cancelled" &&
      (trip.startAt.getTime() <= Date.now() ||
        trip.status === "cancelled" ||
        trip.status === "finished")
    ) {
      throw new BadRequestException("Only an upcoming active trip can be cancelled");
    }
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
      bikeType: dto.bikeType,
      asphaltPercent: dto.asphaltPercent,
      unpavedPercent: dto.unpavedPercent,
      unpavedSurfaceDetails: dto.unpavedSurfaceDetails ?? [],
      dropPolicy: dto.dropPolicy,
      routeDescription: dto.routeDescription ?? null,
      equipmentRequirements: dto.equipmentRequirements ?? null,
      rules: dto.rules ?? null,
      maxParticipants: dto.maxParticipants ?? null,
      registrationMode: dto.registrationMode ?? "automatic",
      coverImage: dto.coverImage ?? null,
      organizerId: dto.organizerId,
      cityId: dto.cityId,
    };
  }

  private validateSurfaceComposition(asphaltPercent: number, unpavedPercent: number): void {
    if (asphaltPercent + unpavedPercent !== 100) {
      throw new BadRequestException("Asphalt and unpaved percentages must add up to 100");
    }
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
    if (dto.bikeType !== undefined) update.bikeType = dto.bikeType;
    if (dto.asphaltPercent !== undefined) update.asphaltPercent = dto.asphaltPercent;
    if (dto.unpavedPercent !== undefined) update.unpavedPercent = dto.unpavedPercent;
    if (dto.unpavedSurfaceDetails !== undefined)
      update.unpavedSurfaceDetails = dto.unpavedSurfaceDetails;
    if (dto.dropPolicy !== undefined) update.dropPolicy = dto.dropPolicy;
    if (dto.routeDescription !== undefined) update.routeDescription = dto.routeDescription;
    if (dto.equipmentRequirements !== undefined)
      update.equipmentRequirements = dto.equipmentRequirements;
    if (dto.rules !== undefined) update.rules = dto.rules;
    if (dto.maxParticipants !== undefined) update.maxParticipants = dto.maxParticipants;
    if (dto.registrationMode !== undefined) update.registrationMode = dto.registrationMode;
    if (dto.coverImage !== undefined) update.coverImage = dto.coverImage;
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
