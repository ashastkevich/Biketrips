import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

import { AuthService } from "./auth.service.js";

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
}

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("telegram")
  async telegramLogin(@Body() dto: TelegramLoginDto) {
    return this.authService.loginWithTelegram({ ...dto });
  }

  @Post("dev-login")
  async devLogin(@Body() dto: DevLoginDto) {
    return this.authService.issueToken({ sub: dto.userId, name: dto.name ?? "Local organizer" });
  }
}
