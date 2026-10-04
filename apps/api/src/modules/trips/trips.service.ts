import { mkdir, readdir, readFile, rename, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import sharp from "sharp";
import { Not, Repository } from "typeorm";
import { slugifyTripTitle, type TripStatus } from "@biketrips/domain";

import { TripEntity } from "../../infrastructure/database/entities/trip.entity.js";
import { TripUpdateEntity } from "../../infrastructure/database/entities/trip-update.entity.js";
import { OrganizerEntity } from "../../infrastructure/database/entities/organizer.entity.js";
import { UserEntity } from "../../infrastructure/database/entities/user.entity.js";
import { CityEntity } from "../../infrastructure/database/entities/city.entity.js";
import { RouteFileEntity } from "../../infrastructure/database/entities/route-file.entity.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import type { CreateTripDto, TripFiltersDto, UpdateTripDto } from "./dto/trip.dto.js";
import { normalizeRouteFileName } from "./route-file-names.js";

const maxRouteGpxBytes = 1_000_000;
const maxCoverImageBytes = 5_000_000;
const coverImageWidth = 1600;
const routeFilesDirectory =
  process.env.ROUTE_FILES_DIR ?? path.join(process.cwd(), "storage", "route-files");
const coverImagesDirectory =
  process.env.COVER_IMAGES_DIR ?? path.join(process.cwd(), "storage", "cover-images");

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export type UploadedRouteFile = UploadedFile;
export type UploadedCoverImage = UploadedFile;

export interface RouteFileDownload {
  fileName: string;
  contentType: string;
  content: Buffer;
}

export interface CoverImageDownload {
  contentType: string;
  content: Buffer;
}

export interface TripActor {
  id: string;
  name?: string;
  role: "user" | "admin";
  phone?: string;
  phoneVerified?: boolean;
}

const moderatedTextFields = [
  "title",
  "description",
  "startLocationName",
  "routeDescription",
  "equipmentRequirements",
  "rules",
  "coverImage",
] as const;

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
    @InjectRepository(RouteFileEntity)
    private readonly routeFilesRepository: Repository<RouteFileEntity>,
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

    query.andWhere("trip.status = :status", { status: "published" });

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

  async listMine(actorId: string): Promise<TripEntity[]> {
    return this.tripsRepository.find({
      where: { organizer: { userId: actorId } },
      relations: {
        city: true,
        organizer: { user: true },
        participants: { user: true },
        waitlistEntries: { user: true },
        updates: true,
        routeFiles: true,
      },
      order: { startAt: "ASC" },
    });
  }

  async listModerationQueue(): Promise<TripEntity[]> {
    return this.tripsRepository
      .createQueryBuilder("trip")
      .leftJoinAndSelect("trip.city", "city")
      .leftJoinAndSelect("trip.organizer", "organizer")
      .leftJoinAndSelect("organizer.user", "organizerUser")
      .leftJoinAndSelect("trip.participants", "participants")
      .leftJoinAndSelect("trip.routeFiles", "routeFiles")
      .where("trip.moderationStatus = :status", { status: "pending_review" })
      .orderBy("trip.submittedForReviewAt", "ASC", "NULLS LAST")
      .getMany();
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

  async getVisibleBySlugOrId(slugOrId: string, actor: TripActor | null): Promise<{
    trip: TripEntity;
    includePendingRevision: boolean;
  }> {
    const trip = await this.getBySlugOrId(slugOrId);
    const ownsTrip = actor?.id === trip.organizer.userId;
    const isAdmin = actor?.role === "admin";

    if (trip.status !== "published" && !ownsTrip && !isAdmin) {
      throw new NotFoundException("Trip not found");
    }

    return {
      trip,
      includePendingRevision: Boolean((ownsTrip || isAdmin) && trip.pendingRevision),
    };
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
    const bypassesModeration = actor.role === "admin";
    const trip = this.tripsRepository.create({
      ...this.mapWritableFields(dto),
      organizerId: organizer.id,
      status: bypassesModeration ? "published" : "draft",
      moderationStatus: bypassesModeration ? "approved" : "draft",
      moderatedAt: bypassesModeration ? new Date() : null,
      moderatedByUserId: bypassesModeration ? actor.id : null,
      publicSlug: await this.createUniqueSlug(dto.title),
    });

    const savedTrip = await this.tripsRepository.save(trip);
    return this.getBySlugOrId(savedTrip.id);
  }

  async createWithRouteFile(
    dto: CreateTripDto,
    routeFile: UploadedRouteFile | undefined,
    coverImage: UploadedCoverImage | undefined,
    actor: {
      id: string;
      name?: string;
      role: "user" | "admin";
      phone?: string;
      phoneVerified: boolean;
    },
  ): Promise<TripEntity> {
    if (routeFile) this.validateUploadedRouteFile(routeFile);
    if (coverImage) this.validateUploadedCoverImage(coverImage);
    const savedTrip = await this.create(dto, actor);
    if (routeFile) {
      await this.replaceRouteFile(savedTrip.id, routeFile);
    }
    if (coverImage) {
      await this.replaceCoverImage(savedTrip.id, coverImage);
    }

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

  async update(
    id: string,
    dto: UpdateTripDto,
    actor: TripActor,
  ): Promise<TripEntity> {
    const trip = await this.getBySlugOrId(id);
    if (trip.organizer.userId !== actor.id) {
      throw new ForbiddenException("Only the trip organizer can edit it");
    }
    if (
      trip.startAt.getTime() <= Date.now() ||
      trip.status === "cancelled" ||
      trip.status === "finished" ||
      trip.status === "rejected" ||
      trip.moderationStatus === "pending_review" ||
      trip.moderationStatus === "rejected"
    ) {
      throw new BadRequestException("Only an upcoming active trip can be edited");
    }
    this.validateSurfaceComposition(
      dto.asphaltPercent ?? trip.asphaltPercent,
      dto.unpavedPercent ?? trip.unpavedPercent
    );
    const writableFields = this.mapUpdateFields(dto);
    const requiresRevision = trip.status === "published" && actor.role !== "admin";

    if (requiresRevision) {
      const moderatedUpdate = this.onlyChangedFields(
        trip,
        this.pickModeratedFields(writableFields),
        trip.pendingRevision,
      );
      const immediateUpdate = this.omitModeratedFields(writableFields);
      Object.assign(trip, immediateUpdate);

      if (Object.keys(moderatedUpdate).length > 0) {
        trip.pendingRevision = { ...(trip.pendingRevision ?? {}), ...moderatedUpdate };
        trip.moderationStatus = "pending_review";
        trip.moderationComment = null;
        trip.submittedForReviewAt = new Date();
      }
    } else {
      if (dto.title !== undefined && dto.title !== trip.title) {
        trip.publicSlug = await this.createUniqueSlug(dto.title, trip.id);
      }
      Object.assign(trip, writableFields);
    }
    const savedTrip = await this.tripsRepository.save(trip);

    if (savedTrip.status === "published" && Object.keys(this.omitModeratedFields(writableFields)).length > 0) {
      await this.tripUpdatesRepository.save(
        this.tripUpdatesRepository.create({
          tripId: savedTrip.id,
          title: "Детали поездки обновлены",
          body: "Организатор изменил информацию о поездке.",
        }),
      );
      await this.notificationsService.enqueueTripUpdatedNotification(savedTrip);
    }

    if (savedTrip.moderationStatus === "pending_review" && savedTrip.pendingRevision) {
      await this.notificationsService.enqueueModerationSubmitted(savedTrip);
    }

    return this.getBySlugOrId(savedTrip.id);
  }

  async updateWithRouteFile(
    id: string,
    dto: UpdateTripDto,
    routeFile: UploadedRouteFile | undefined,
    coverImage: UploadedCoverImage | undefined,
    removeRouteFile: boolean,
    actor: TripActor,
  ): Promise<TripEntity> {
    if (routeFile) this.validateUploadedRouteFile(routeFile);
    if (coverImage) this.validateUploadedCoverImage(coverImage);
    const currentTrip = await this.getBySlugOrId(id);
    const stageCover = currentTrip.status === "published" && actor.role !== "admin";
    const savedTrip = await this.update(id, dto, actor);

    if (routeFile) {
      await this.replaceRouteFile(savedTrip.id, routeFile);
    } else if (removeRouteFile) {
      await this.deleteRouteFiles(savedTrip.id);
    }
    if (coverImage) {
      if (stageCover) {
        await this.stageCoverImage(savedTrip.id, coverImage);
      } else {
        await this.replaceCoverImage(savedTrip.id, coverImage);
      }
    } else if (
      !stageCover &&
      dto.coverImage !== undefined &&
      !this.isUploadedCoverImageUrl(dto.coverImage)
    ) {
      await this.deleteCoverImage(savedTrip.id);
    }

    return this.getBySlugOrId(savedTrip.id);
  }

  async transition(
    id: string,
    status: Extract<TripStatus, "published" | "cancelled" | "finished">,
    actor: { id: string; role: "user" | "admin" },
  ): Promise<TripEntity> {
    const trip = await this.getBySlugOrId(id);
    if (status === "published" && actor.role !== "admin") {
      throw new ForbiddenException("Only an administrator can publish a trip");
    }
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

  async submitForReview(id: string, actor: TripActor): Promise<TripEntity> {
    const trip = await this.getBySlugOrId(id);
    if (trip.organizer.userId !== actor.id) {
      throw new ForbiddenException("Only the trip organizer can submit it for review");
    }
    if (actor.role === "admin") {
      if (trip.status !== "published") {
        trip.status = "published";
        trip.moderationStatus = "approved";
        trip.moderatedAt = new Date();
        trip.moderatedByUserId = actor.id;
        await this.tripsRepository.save(trip);
      }
      return this.getBySlugOrId(id);
    }
    if (trip.status !== "draft" && trip.status !== "changes_requested") {
      throw new BadRequestException("Only a draft or returned trip can be submitted");
    }

    trip.status = "pending_review";
    trip.moderationStatus = "pending_review";
    trip.moderationComment = null;
    trip.submittedForReviewAt = new Date();
    const savedTrip = await this.tripsRepository.save(trip);
    await this.notificationsService.enqueueModerationSubmitted(savedTrip);
    return this.getBySlugOrId(id);
  }

  async withdrawReview(id: string, actor: TripActor): Promise<TripEntity> {
    const trip = await this.getBySlugOrId(id);
    if (trip.organizer.userId !== actor.id) {
      throw new ForbiddenException("Only the trip organizer can withdraw it");
    }
    if (trip.moderationStatus !== "pending_review") {
      throw new BadRequestException("This trip is not awaiting review");
    }

    if (trip.status === "published") {
      await this.deletePendingCoverImage(trip);
      trip.pendingRevision = null;
      trip.pendingCoverStorageKey = null;
      trip.moderationStatus = "approved";
    } else {
      trip.status = "draft";
      trip.moderationStatus = "draft";
    }
    trip.moderationComment = null;
    trip.submittedForReviewAt = null;
    return this.tripsRepository.save(trip);
  }

  async moderate(
    id: string,
    decision: "approve" | "request_changes" | "reject",
    comment: string | undefined,
    admin: TripActor,
  ): Promise<TripEntity> {
    if (admin.role !== "admin") {
      throw new ForbiddenException("Administrator access is required");
    }
    const normalizedComment = comment?.trim();
    if (decision !== "approve" && !normalizedComment) {
      throw new BadRequestException("Moderation comment is required");
    }

    const trip = await this.getBySlugOrId(id);
    if (trip.moderationStatus !== "pending_review") {
      throw new BadRequestException("Trip is not awaiting review");
    }

    const isPublishedRevision = trip.status === "published";
    trip.moderatedAt = new Date();
    trip.moderatedByUserId = admin.id;
    trip.moderationComment = normalizedComment ?? null;

    if (decision === "approve") {
      if (isPublishedRevision && trip.pendingRevision) {
        const proposedTitle = trip.pendingRevision.title;
        if (typeof proposedTitle === "string" && proposedTitle !== trip.title) {
          trip.publicSlug = await this.createUniqueSlug(proposedTitle, trip.id);
        }
        if (
          "coverImage" in trip.pendingRevision &&
          !trip.pendingCoverStorageKey &&
          trip.coverImage &&
          this.isUploadedCoverImageUrl(trip.coverImage)
        ) {
          await this.deleteCoverImage(trip.id);
        }
        Object.assign(trip, trip.pendingRevision);
        await this.promotePendingCoverImage(trip);
        trip.pendingRevision = null;
        trip.pendingCoverStorageKey = null;
      } else {
        trip.status = "published";
      }
      trip.moderationStatus = "approved";
      trip.moderationComment = null;
    } else if (decision === "request_changes") {
      trip.moderationStatus = "changes_requested";
      if (!isPublishedRevision) trip.status = "changes_requested";
    } else {
      await this.deletePendingCoverImage(trip);
      trip.pendingRevision = null;
      trip.pendingCoverStorageKey = null;
      trip.moderationStatus = "rejected";
      if (!isPublishedRevision) trip.status = "rejected";
    }

    const savedTrip = await this.tripsRepository.save(trip);
    if (decision === "approve" && !isPublishedRevision) {
      await this.notificationsService.enqueueTripStatusNotification(savedTrip, "published");
    }
    await this.notificationsService.enqueueModerationDecision(savedTrip, decision);
    return this.getBySlugOrId(id);
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

  async getRouteFileForDownload(id: string, actor: TripActor | null = null): Promise<RouteFileDownload> {
    const trip = await this.getBySlugOrId(id);
    if (
      trip.status !== "published" &&
      trip.organizer.userId !== actor?.id &&
      actor?.role !== "admin"
    ) {
      throw new NotFoundException("Route file not found");
    }

    const routeFile = trip.routeFiles?.[0];
    if (!routeFile) {
      throw new NotFoundException("Route file not found");
    }

    const filePath = this.getRouteFilePath(routeFile.storageKey);
    try {
      return {
        fileName: normalizeRouteFileName(routeFile.originalName),
        contentType: routeFile.contentType,
        content: await readFile(filePath),
      };
    } catch {
      throw new NotFoundException("Route file not found");
    }
  }

  async getCoverImageForDownload(id: string, actor: TripActor | null = null): Promise<CoverImageDownload> {
    const trip = await this.getBySlugOrId(id);
    if (
      trip.status !== "published" &&
      trip.organizer.userId !== actor?.id &&
      actor?.role !== "admin"
    ) {
      throw new NotFoundException("Cover image not found");
    }
    if (!trip.coverImage || !this.isUploadedCoverImageUrl(trip.coverImage)) {
      throw new NotFoundException("Cover image not found");
    }

    const storageKey = await this.getStoredCoverImageKey(trip.id);
    try {
      return {
        contentType: this.getCoverImageContentType(storageKey),
        content: await readFile(this.getCoverImagePath(storageKey)),
      };
    } catch {
      throw new NotFoundException("Cover image not found");
    }
  }

  async getPendingCoverImageForDownload(id: string, actor: TripActor): Promise<CoverImageDownload> {
    const trip = await this.getBySlugOrId(id);
    if (trip.organizer.userId !== actor.id && actor.role !== "admin") {
      throw new NotFoundException("Cover image not found");
    }
    if (!trip.pendingCoverStorageKey) {
      throw new NotFoundException("Cover image not found");
    }

    try {
      return {
        contentType: this.getCoverImageContentType(trip.pendingCoverStorageKey),
        content: await readFile(this.getCoverImagePath(trip.pendingCoverStorageKey)),
      };
    } catch {
      throw new NotFoundException("Cover image not found");
    }
  }

  private async replaceRouteFile(
    tripId: string,
    routeFile: UploadedRouteFile,
  ): Promise<void> {
    this.validateUploadedRouteFile(routeFile);
    await this.deleteRouteFiles(tripId);

    const originalName = normalizeRouteFileName(routeFile.originalname);
    const safeFileName = this.sanitizeRouteFileName(originalName);
    const storageKey = `${tripId}/${Date.now()}-${safeFileName}`;
    const filePath = this.getRouteFilePath(storageKey);

    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, routeFile.buffer);
    await this.routeFilesRepository.save(
      this.routeFilesRepository.create({
        tripId,
        originalName,
        contentType: "application/gpx+xml",
        storageKey,
      }),
    );
  }

  private async deleteRouteFiles(tripId: string): Promise<void> {
    const routeFiles = await this.routeFilesRepository.find({ where: { tripId } });

    await Promise.all(
      routeFiles.map(async (routeFile) => {
        await unlink(this.getRouteFilePath(routeFile.storageKey)).catch(() => undefined);
      }),
    );
    await this.routeFilesRepository.delete({ tripId });
  }

  private async replaceCoverImage(
    tripId: string,
    coverImage: UploadedCoverImage,
  ): Promise<void> {
    this.validateUploadedCoverImage(coverImage);
    await this.deleteCoverImage(tripId);

    const version = Date.now();
    const optimizedCoverImage = await this.optimizeCoverImage(coverImage);
    const storageKey = `${tripId}/${version}-cover.webp`;
    const filePath = this.getCoverImagePath(storageKey);
    const coverImageUrl = `/trips/${tripId}/cover-image?v=${version}`;

    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, optimizedCoverImage);
    await this.tripsRepository.update({ id: tripId }, { coverImage: coverImageUrl });
  }

  private async stageCoverImage(tripId: string, coverImage: UploadedCoverImage): Promise<void> {
    this.validateUploadedCoverImage(coverImage);
    const trip = await this.getBySlugOrId(tripId);
    await this.deletePendingCoverImage(trip);

    const version = Date.now();
    const optimizedCoverImage = await this.optimizeCoverImage(coverImage);
    const storageKey = `${tripId}/${version}-pending-cover.webp`;
    const filePath = this.getCoverImagePath(storageKey);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, optimizedCoverImage);

    trip.pendingCoverStorageKey = storageKey;
    trip.pendingRevision = {
      ...(trip.pendingRevision ?? {}),
      coverImage: `/trips/${tripId}/pending-cover-image?v=${version}`,
    };
    trip.moderationStatus = "pending_review";
    trip.moderationComment = null;
    trip.submittedForReviewAt = new Date();
    await this.tripsRepository.save(trip);
    await this.notificationsService.enqueueModerationSubmitted(trip);
  }

  private async promotePendingCoverImage(trip: TripEntity): Promise<void> {
    if (!trip.pendingCoverStorageKey) return;

    const directory = path.join(coverImagesDirectory, trip.id);
    const fileNames = await readdir(directory).catch(() => []);
    await Promise.all(
      fileNames
        .filter((fileName) => !trip.pendingCoverStorageKey?.endsWith(`/${fileName}`))
        .map((fileName) => unlink(path.join(directory, fileName)).catch(() => undefined)),
    );

    const version = Date.now();
    const promotedKey = `${trip.id}/${version}-cover.webp`;
    await rename(
      this.getCoverImagePath(trip.pendingCoverStorageKey),
      this.getCoverImagePath(promotedKey),
    );
    trip.coverImage = `/trips/${trip.id}/cover-image?v=${version}`;
  }

  private async deletePendingCoverImage(trip: TripEntity): Promise<void> {
    if (!trip.pendingCoverStorageKey) return;
    await unlink(this.getCoverImagePath(trip.pendingCoverStorageKey)).catch(() => undefined);
  }

  private async deleteCoverImage(tripId: string): Promise<void> {
    const trip = await this.tripsRepository.findOne({ where: { id: tripId } });
    if (!trip?.coverImage || !this.isUploadedCoverImageUrl(trip.coverImage)) return;

    await rm(path.join(coverImagesDirectory, tripId), { recursive: true, force: true });
  }

  private validateUploadedRouteFile(routeFile: UploadedRouteFile): void {
    if (!normalizeRouteFileName(routeFile.originalname).toLowerCase().endsWith(".gpx")) {
      throw new BadRequestException("Route file must use .gpx extension");
    }
    if (routeFile.size > maxRouteGpxBytes || routeFile.buffer.byteLength > maxRouteGpxBytes) {
      throw new BadRequestException("Route GPX file is too large");
    }
    if (!/<gpx[\s>]/i.test(routeFile.buffer.toString("utf8", 0, 512))) {
      throw new BadRequestException("Route file must contain GPX XML");
    }
  }

  private validateUploadedCoverImage(coverImage: UploadedCoverImage): void {
    if (!["image/jpeg", "image/png", "image/webp"].includes(coverImage.mimetype)) {
      throw new BadRequestException("Cover image must be JPEG, PNG or WebP");
    }
    if (coverImage.size > maxCoverImageBytes || coverImage.buffer.byteLength > maxCoverImageBytes) {
      throw new BadRequestException("Cover image is too large");
    }
  }

  private async optimizeCoverImage(coverImage: UploadedCoverImage): Promise<Buffer> {
    try {
      return await sharp(coverImage.buffer)
        .rotate()
        .resize({ width: coverImageWidth, withoutEnlargement: true })
        .webp({ quality: 78, effort: 5 })
        .toBuffer();
    } catch {
      throw new BadRequestException("Cover image could not be processed");
    }
  }

  private sanitizeRouteFileName(fileName: string): string {
    const normalized = path.basename(fileName).replace(/[^a-zA-Z0-9._-]+/g, "-");
    return normalized || "route.gpx";
  }

  private getRouteFilePath(storageKey: string): string {
    const filePath = path.join(routeFilesDirectory, storageKey);
    const relativePath = path.relative(routeFilesDirectory, filePath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      throw new BadRequestException("Invalid route file path");
    }

    return filePath;
  }

  private getCoverImagePath(storageKey: string): string {
    const decodedKey = decodeURIComponent(storageKey);
    const filePath = path.join(coverImagesDirectory, decodedKey);
    const relativePath = path.relative(coverImagesDirectory, filePath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      throw new BadRequestException("Invalid cover image path");
    }

    return filePath;
  }

  private isUploadedCoverImageUrl(coverImage: string): boolean {
    return /^\/trips\/[0-9a-f-]+\/cover-image(?:\?v=\d+)?$/i.test(coverImage);
  }

  private getCoverImageContentType(storageKey: string): string {
    const extension = path.extname(storageKey).toLowerCase();
    if (extension === ".png") return "image/png";
    if (extension === ".webp") return "image/webp";
    return "image/jpeg";
  }

  private async getStoredCoverImageKey(tripId: string): Promise<string> {
    const directory = path.join(coverImagesDirectory, tripId);
    const fileName = (await readdir(directory)).find((entry) => !entry.includes("-pending-cover"));
    if (!fileName) {
      throw new NotFoundException("Cover image not found");
    }

    return `${tripId}/${fileName}`;
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
    if (dto.cityId !== undefined) update.cityId = dto.cityId;

    return update;
  }

  private pickModeratedFields(update: Partial<TripEntity>): Partial<TripEntity> {
    const moderated: Partial<TripEntity> = {};
    for (const field of moderatedTextFields) {
      if (field in update) {
        Object.assign(moderated, { [field]: update[field] });
      }
    }
    return moderated;
  }

  private omitModeratedFields(update: Partial<TripEntity>): Partial<TripEntity> {
    const immediate = { ...update };
    for (const field of moderatedTextFields) {
      delete immediate[field];
    }
    return immediate;
  }

  private onlyChangedFields(
    trip: TripEntity,
    update: Partial<TripEntity>,
    pendingRevision: Record<string, unknown> | null,
  ): Partial<TripEntity> {
    const changed: Partial<TripEntity> = {};
    for (const [field, value] of Object.entries(update)) {
      const currentValue = pendingRevision && field in pendingRevision
        ? pendingRevision[field]
        : trip[field as keyof TripEntity];
      const normalizedCurrent = currentValue instanceof Date
        ? currentValue.toISOString()
        : currentValue;
      const normalizedNext = value instanceof Date ? value.toISOString() : value;
      if (JSON.stringify(normalizedCurrent) !== JSON.stringify(normalizedNext)) {
        Object.assign(changed, { [field]: value });
      }
    }
    return changed;
  }

  private async createUniqueSlug(title: string, excludedTripId?: string): Promise<string> {
    const baseSlug = slugifyTripTitle(title);
    const fallbackSlug = `trip-${Date.now()}`;
    const slug = baseSlug || fallbackSlug;
    let candidate = slug;
    let suffix = 2;

    while (
      await this.tripsRepository.exists({
        where: {
          publicSlug: candidate,
          ...(excludedTripId ? { id: Not(excludedTripId) } : {}),
        },
      })
    ) {
      candidate = `${slug}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }
}
