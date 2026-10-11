import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { LessThan, MoreThanOrEqual, type Repository } from "typeorm";

import type { OrganizerEntity } from "../../infrastructure/database/entities/organizer.entity.js";
import type { TripEntity } from "../../infrastructure/database/entities/trip.entity.js";
import { OrganizersService } from "./organizers.service.js";

describe("OrganizersService", () => {
  it("lists only public trips: published upcoming ones and approved past ones", async () => {
    const { service, tripsRepository } = createService();
    const now = new Date("2026-10-11T10:00:00.000Z");

    await service.listPublicTrips("organizer-1", now);

    const pastWhere = [
      { organizerId: "organizer-1", status: "finished", moderationStatus: "approved" },
      { organizerId: "organizer-1", status: "published", startAt: LessThan(now) },
    ];
    expect(tripsRepository.find).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: { organizerId: "organizer-1", status: "published", startAt: MoreThanOrEqual(now) },
    }));
    expect(tripsRepository.find).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: pastWhere,
      take: 6,
    }));
    expect(tripsRepository.count).toHaveBeenCalledWith({ where: pastWhere });
  });

  it("stores a trimmed bio and clears an empty one", async () => {
    const { service, organizersRepository } = createService();

    await expect(service.updateBio("user-1", "  Гравий\r\nи кофе  ")).resolves.toMatchObject({
      bio: "Гравий\nи кофе",
    });
    await expect(service.updateBio("user-1", "   ")).resolves.toMatchObject({ bio: null });
    expect(organizersRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } }),
    );
  });

  it("does not let users without trips write an organizer bio", async () => {
    const { service, organizersRepository } = createService(null);

    await expect(service.updateBio("user-2", "Привет")).rejects.toBeInstanceOf(NotFoundException);
    expect(organizersRepository.save).not.toHaveBeenCalled();
  });
});

function createService(organizer: Partial<OrganizerEntity> | null = { id: "organizer-1", userId: "user-1", bio: null }) {
  const organizersRepository = {
    findOne: vi.fn(async () => (organizer ? { ...organizer } : null)),
    save: vi.fn(async (entity: OrganizerEntity) => entity),
  };
  const tripsRepository = {
    find: vi.fn(async () => [] as TripEntity[]),
    count: vi.fn(async () => 0),
  };
  const service = new OrganizersService(
    organizersRepository as unknown as Repository<OrganizerEntity>,
    tripsRepository as unknown as Repository<TripEntity>,
  );

  return { service, organizersRepository, tripsRepository };
}
