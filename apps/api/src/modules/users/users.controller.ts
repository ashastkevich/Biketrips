import { Body, Controller, ForbiddenException, Get, Inject, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
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

class UpdateUserDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  cityId?: string;
}

@ApiTags("users")
@Controller("users")
export class UsersController {
  constructor(
    @Inject(UsersService)
    private readonly usersService: UsersService,
  ) {}

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async get(@Param("id") id: string) {
    return this.usersService.get(id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async update(
    @Param("id") id: string,
    @Req() request: { user: { id: string; role: "user" | "admin" } },
    @Body() dto: UpdateUserDto,
  ) {
    if (request.user.id !== id && request.user.role !== "admin") {
      throw new ForbiddenException("You can only edit your own profile");
    }
    return this.usersService.update(id, dto);
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }
}
