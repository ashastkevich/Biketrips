import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";

import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { JwtStrategy } from "./jwt.strategy.js";

@Module({
  imports: [PassportModule.register({ defaultStrategy: "jwt" })],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
