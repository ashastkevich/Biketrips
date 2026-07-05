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

  async update(
    id: string,
    input: { name: string; email?: string; phoneNumber?: string },
  ): Promise<UserEntity> {
    const user = await this.get(id);
    user.name = input.name;
    user.email = input.email?.trim() || null;
    user.phoneNumber = input.phoneNumber?.trim() || null;
    return this.usersRepository.save(user);
  }
}
