import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { UserEntity } from "../../infrastructure/database/entities/user.entity.js";
import { CityEntity } from "../../infrastructure/database/entities/city.entity.js";
import { UsersController } from "./users.controller.js";
import { UsersService } from "./users.service.js";

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, CityEntity])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
