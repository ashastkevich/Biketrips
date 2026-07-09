import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { CityEntity } from "../../infrastructure/database/entities/city.entity.js";
import { CitiesController } from "./cities.controller.js";
import { CitiesService } from "./cities.service.js";

@Module({
  imports: [TypeOrmModule.forFeature([CityEntity])],
  controllers: [CitiesController],
  providers: [CitiesService],
})
export class CitiesModule {}
