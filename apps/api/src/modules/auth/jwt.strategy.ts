import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { TokenPayload } from "./auth.service.js";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? "local-development-secret",
    });
  }

  validate(payload: TokenPayload) {
    return {
      id: payload.sub,
      name: payload.name,
      role: payload.role ?? "user",
      phone: payload.phone,
      phoneVerified: payload.phoneVerified ?? false,
      email: payload.email,
      emailVerified: payload.emailVerified ?? false,
      telegram: payload.telegram,
      telegramVerified: payload.telegramVerified ?? false,
    };
  }
}
