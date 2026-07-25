import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";

import { EmailAuthCodeEntity } from "../../infrastructure/database/entities/email-auth-code.entity.js";
import { TelegramAccountEntity } from "../../infrastructure/database/entities/telegram-account.entity.js";
import { TelegramLoginNonceEntity } from "../../infrastructure/database/entities/telegram-login-nonce.entity.js";
import { UserEntity } from "../../infrastructure/database/entities/user.entity.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { JwtStrategy } from "./jwt.strategy.js";
import { AdminGuard, TripCreatorGuard } from "./access.guards.js";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    TypeOrmModule.forFeature([
      EmailAuthCodeEntity,
      TelegramAccountEntity,
      TelegramLoginNonceEntity,
      UserEntity,
    ]),
  ],
  controllers: [AuthController],
  providers: [AdminGuard, AuthService, JwtStrategy, TripCreatorGuard],
  exports: [AdminGuard, AuthService, TripCreatorGuard],
})
export class AuthModule {}
