import { Body, Controller, Get, Headers, Inject, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, Matches } from "class-validator";
import { userRoles } from "@biketrips/domain";
import type { UserRole } from "@biketrips/domain";

import { AuthService } from "./auth.service.js";
import type { TokenPayload } from "./auth.service.js";
import { getClientIp, type ClientIpRequest } from "./client-ip.js";
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

// Messages are shown to the visitor as is, so they are in Russian.
const invalidEmailMessage = "Укажите корректный адрес электронной почты";

class EmailCodeRequestDto {
  @IsEmail({}, { message: invalidEmailMessage })
  email!: string;
}

class EmailCodeVerifyDto {
  @IsEmail({}, { message: invalidEmailMessage })
  email!: string;

  @Matches(/^\d{6}$/, { message: "Неверный код подтверждения" })
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
  async requestEmailCode(@Body() dto: EmailCodeRequestDto, @Req() request: ClientIpRequest) {
    return this.authService.requestEmailCode(dto, getClientIp(request));
  }

  @Post("email/verify")
  async verifyEmailCode(
    @Body() dto: EmailCodeVerifyDto,
    @Headers("authorization") authorization?: string,
  ) {
    return this.authService.verifyEmailCode(dto, authorization);
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
