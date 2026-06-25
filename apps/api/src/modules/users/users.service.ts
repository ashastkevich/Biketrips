import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { UserEntity } from "../../infrastructure/database/entities/user.entity.js";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>
  ) {}

  async get(id: string): Promise<UserEntity> {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  async create(input: { name: string; email?: string }): Promise<UserEntity> {
    return this.usersRepository.save(
      this.usersRepository.create({
        name: input.name,
        email: input.email ?? null,
      })
    );
  }
}
