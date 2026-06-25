import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { OrganizerEntity } from "../../infrastructure/database/entities/organizer.entity.js";

@Injectable()
export class OrganizersService {
  constructor(
    @InjectRepository(OrganizerEntity)
    private readonly organizersRepository: Repository<OrganizerEntity>
  ) {}

  async get(id: string): Promise<OrganizerEntity> {
    const organizer = await this.organizersRepository.findOne({
      where: { id },
      relations: { user: true },
    });

    if (!organizer) {
      throw new NotFoundException("Organizer not found");
    }

    return organizer;
  }

  async create(input: {
    userId: string;
    displayName: string;
    bio?: string;
    contactUrl?: string;
  }): Promise<OrganizerEntity> {
    return this.organizersRepository.save(
      this.organizersRepository.create({
        userId: input.userId,
        displayName: input.displayName,
        bio: input.bio ?? null,
        contactUrl: input.contactUrl ?? null,
      })
    );
  }
}
