import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { DataSource } from "typeorm";

import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { AdminGuard } from "../auth/access.guards.js";

@ApiTags("admin")
@Controller("admin")
export class AdminController {
  constructor(private readonly dataSource: DataSource) {}

  @Get("health")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  async health() {
    return {
      status: "ok",
      database: this.dataSource.isInitialized ? "connected" : "disconnected",
    };
  }
}
