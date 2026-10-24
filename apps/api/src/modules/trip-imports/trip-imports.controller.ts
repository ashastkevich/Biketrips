import { Controller, Get, Inject, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AdminGuard } from "../auth/access.guards.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { TripImportsService } from "./trip-imports.service.js";

@ApiTags("admin")
@Controller("admin/imports")
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class TripImportsController {
  constructor(@Inject(TripImportsService) private readonly tripImportsService: TripImportsService) {}

  @Get()
  listSources() {
    return this.tripImportsService.listSources();
  }

  /** Runs one source right away, regardless of TRIP_IMPORT_ENABLED. */
  @Post(":id/run")
  run(@Param("id", ParseUUIDPipe) id: string) {
    return this.tripImportsService.runSourceById(id);
  }
}
