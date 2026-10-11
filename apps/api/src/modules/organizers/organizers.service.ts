import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, MoreThanOrEqual, Repository, type FindOptionsWhere } from "typeorm";

import { OrganizerEntity } from "../../infrastructure/database/entities/organizer.entity.js";
import { TripEntity } from "../../infrastructure/database/entities/trip.entity.js";
import type { OrganizerProfileTrips } from "./organizers.serializer.js";

const pastTripsLimit = 6;

@Injectable()
export class OrganizersService {
  constructor(
    @InjectRepository(OrganizerEntity)
    private readonly organizersRepository: Repository<OrganizerEntity>,
    @InjectRepository(TripEntity)
    private readonly tripsRepository: Repository<TripEntity>,
  ) {}

  async get(id: string): Promise<OrganizerEntity> {
    return this.findOrFail({ id });
  }

  async getByUserId(userId: string): Promise<OrganizerEntity> {
    return this.findOrFail({ userId });
  }

  async updateBio(userId: string, bio: string): Promise<OrganizerEntity> {
    const organizer = await this.getByUserId(userId);
    organizer.bio = bio.replace(/\r\n?/g, "\n").trim() || null;
    await this.organizersRepository.save(organizer);
    return organizer;
  }

  /** Only trips anyone may see: published upcoming ones and approved ones that already took place. */
  async listPublicTrips(organizerId: string, now = new Date()): Promise<OrganizerProfileTrips> {
    const pastWhere: FindOptionsWhere<TripEntity>[] = [
      { organizerId, status: "finished", moderationStatus: "approved" },
      // Published trips stay published until the auto-finish job catches up with them.
      { organizerId, status: "published", startAt: LessThan(now) },
    ];
    const [upcomingTrips, pastTrips, completedTripsCount] = await Promise.all([
      this.tripsRepository.find({
        where: { organizerId, status: "published", startAt: MoreThanOrEqual(now) },
        relations: { city: true, participants: true },
        order: { startAt: "ASC" },
      }),
      this.tripsRepository.find({
        where: pastWhere,
        relations: { city: true, participants: true },
        order: { startAt: "DESC" },
        take: pastTripsLimit,
      }),
      this.tripsRepository.count({ where: pastWhere }),
    ]);

    return { upcomingTrips, pastTrips, completedTripsCount };
  }

  private async findOrFail(where: FindOptionsWhere<OrganizerEntity>): Promise<OrganizerEntity> {
    const organizer = await this.organizersRepository.findOne({
      where,
      relations: { user: { city: true } },
    });

    if (!organizer) {
      throw new NotFoundException("Organizer not found");
    }

    return organizer;
  }
}
