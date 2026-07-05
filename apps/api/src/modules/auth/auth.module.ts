import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";

import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { JwtStrategy } from "./jwt.strategy.js";
import { AdminGuard, TripCreatorGuard } from "./access.guards.js";

@Module({
  imports: [PassportModule.register({ defaultStrategy: "jwt" })],
  controllers: [AuthController],
  providers: [AdminGuard, AuthService, JwtStrategy, TripCreatorGuard],
  exports: [AdminGuard, AuthService, TripCreatorGuard],
})
export class AuthModule {}
