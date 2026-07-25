import { Body, Controller, Get, Headers, Inject, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, Matches } from "class-validator";
import { userRoles } from "@biketrips/domain";
import type { UserRole } from "@biketrips/domain";

import { AuthService } from "./auth.service.js";
import type { TokenPayload } from "./auth.service.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";

class TelegramLoginStatusDto {
  @IsString()
  loginId!: string;

  @IsString()
  pollToken!: string;
}

class TelegramLoginConfirmDto {
  @IsString()
  startParam!: string;

  @IsString()
  telegramId!: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;
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

class EmailCodeRequestDto {
  @IsEmail()
  email!: string;
}

class EmailCodeVerifyDto {
  @IsEmail()
  email!: string;

  @Matches(/^\d{6}$/)
  code!: string;
}

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post("telegram/request")
  async requestTelegramLogin(@Req() request: { headers: { authorization?: string } }) {
    return this.authService.requestTelegramLogin(request.headers.authorization);
  }

  @Post("telegram/status")
  async getTelegramLoginStatus(@Body() dto: TelegramLoginStatusDto) {
    return this.authService.getTelegramLoginStatus(dto);
  }

  @Post("telegram/confirm")
  async confirmTelegramLogin(
    @Body() dto: TelegramLoginConfirmDto,
    @Headers("authorization") authorization?: string,
  ) {
    return this.authService.confirmTelegramLogin(dto, authorization);
  }

  @Post("email/request")
  async requestEmailCode(@Body() dto: EmailCodeRequestDto) {
    return this.authService.requestEmailCode(dto);
  }

  @Post("email/verify")
  async verifyEmailCode(@Body() dto: EmailCodeVerifyDto) {
    return this.authService.verifyEmailCode(dto);
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
