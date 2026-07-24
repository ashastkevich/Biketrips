import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { UserEntity } from "../../infrastructure/database/entities/user.entity.js";
import { CityEntity } from "../../infrastructure/database/entities/city.entity.js";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(CityEntity)
    private readonly citiesRepository: Repository<CityEntity>,
  ) {}

  async get(id: string): Promise<UserEntity> {
    const user = await this.usersRepository.findOne({ where: { id }, relations: { city: true } });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  async create(input: { name: string; email?: string }): Promise<UserEntity> {
    const email = input.email?.trim().toLowerCase() || null;
    return this.usersRepository.save(
      this.usersRepository.create({
        name: input.name,
        email,
        emailVerifiedAt: null,
      })
    );
  }

  async update(
    id: string,
    input: { name: string; email?: string; phoneNumber?: string; cityId?: string },
  ): Promise<UserEntity> {
    const user = await this.get(id);
    const cityId = input.cityId?.trim() || null;
    const city = cityId
      ? await this.citiesRepository.findOne({ where: { id: cityId } })
      : null;
    if (cityId && !city) {
      throw new BadRequestException("Unknown city");
    }
    user.name = input.name;
    const nextEmail = input.email?.trim().toLowerCase() || null;
    if (user.email !== nextEmail) {
      user.emailVerifiedAt = null;
    }
    user.email = nextEmail;
    user.phoneNumber = input.phoneNumber?.trim() || null;
    user.cityId = cityId;
    user.city = city;
    await this.usersRepository.save(user);
    return this.get(id);
  }
}
