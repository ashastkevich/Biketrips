import { Body, Controller, Get, Inject, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsOptional, IsString } from "class-validator";
import { userRoles } from "@biketrips/domain";
import type { UserRole } from "@biketrips/domain";

import { AuthService } from "./auth.service.js";
import type { TokenPayload } from "./auth.service.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";

class TelegramLoginDto {
  @IsString()
  id!: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsString()
  photo_url?: string;

  @IsOptional()
  @IsString()
  allows_write_to_pm?: string;

  @IsString()
  auth_date!: string;

  @IsString()
  hash!: string;
}

class DevLoginDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(userRoles)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  phoneVerified?: boolean;

  @IsOptional()
  @IsString()
  phone?: string;
}

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post("telegram")
  async telegramLogin(@Body() dto: TelegramLoginDto) {
    return this.authService.loginWithTelegram({ ...dto });
  }

  @Post("dev-login")
  async devLogin(@Body() dto: DevLoginDto) {
    return this.authService.issueToken({
      sub: dto.userId,
      name: dto.name ?? "Local user",
      role: dto.role ?? "user",
      phone: dto.phone,
      phoneVerified: dto.phoneVerified ?? false,
    });
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async me(@Req() request: { user: TokenPayload }) {
    return request.user;
  }
}
