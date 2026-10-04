import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { InjectDataSource } from "@nestjs/typeorm";
import { IsString, MinLength } from "class-validator";
import { DataSource } from "typeorm";

import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { AdminGuard } from "../auth/access.guards.js";
import { TripsService } from "../trips/trips.service.js";
import { serializeTripDetail } from "../trips/trips.serializer.js";

class ModerationCommentDto {
  @IsString()
  @MinLength(1)
  comment!: string;
}

@ApiTags("admin")
@Controller("admin")
export class AdminController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(TripsService) private readonly tripsService: TripsService,
  ) {}

  @Get("health")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  async health() {
    return {
      status: "ok",
      database: this.dataSource.isInitialized ? "connected" : "disconnected",
    };
  }

  @Get("trips/moderation")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  async listModerationQueue() {
    const trips = await this.tripsService.listModerationQueue();
    return trips.map((trip) => serializeTripDetail(trip, { includePendingRevision: true }));
  }

  @Post("trips/:id/approve")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  async approve(
    @Param("id") id: string,
    @Req() request: { user: { id: string; role: "admin" } },
  ) {
    return serializeTripDetail(
      await this.tripsService.moderate(id, "approve", undefined, request.user),
    );
  }

  @Post("trips/:id/request-changes")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  async requestChanges(
    @Param("id") id: string,
    @Body() body: ModerationCommentDto,
    @Req() request: { user: { id: string; role: "admin" } },
  ) {
    return serializeTripDetail(
      await this.tripsService.moderate(id, "request_changes", body.comment, request.user),
      { includePendingRevision: true },
    );
  }

  @Post("trips/:id/reject")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  async reject(
    @Param("id") id: string,
    @Body() body: ModerationCommentDto,
    @Req() request: { user: { id: string; role: "admin" } },
  ) {
    return serializeTripDetail(
      await this.tripsService.moderate(id, "reject", body.comment, request.user),
    );
  }
}
