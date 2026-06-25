import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { UsersService } from "./users.service.js";

class CreateUserDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  email?: string;
}

@ApiTags("users")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async get(@Param("id") id: string) {
    return this.usersService.get(id);
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }
}
