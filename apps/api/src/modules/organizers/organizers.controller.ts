import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { OrganizersService } from "./organizers.service.js";

class CreateOrganizerDto {
  @IsString()
  userId!: string;

  @IsString()
  displayName!: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  contactUrl?: string;
}

@ApiTags("organizers")
@Controller("organizers")
export class OrganizersController {
  constructor(private readonly organizersService: OrganizersService) {}

  @Get(":id")
  async get(@Param("id") id: string) {
    return this.organizersService.get(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async create(@Body() dto: CreateOrganizerDto) {
    return this.organizersService.create(dto);
  }
}
