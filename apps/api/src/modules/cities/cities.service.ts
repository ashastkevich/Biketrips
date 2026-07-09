import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { CityEntity } from "../../infrastructure/database/entities/city.entity.js";

@Injectable()
export class CitiesService {
  constructor(
    @InjectRepository(CityEntity)
    private readonly citiesRepository: Repository<CityEntity>,
  ) {}

  async list() {
    const cities = await this.citiesRepository.find({ order: { name: "ASC" } });

    return cities.map((city) => ({
      id: city.id,
      name: city.name,
      slug: city.slug,
      timezone: city.timezone,
      centerLat: city.centerLat === null ? null : Number(city.centerLat),
      centerLng: city.centerLng === null ? null : Number(city.centerLng),
    }));
  }
}
