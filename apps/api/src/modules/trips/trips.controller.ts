import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { TripCreatorGuard } from "../auth/access.guards.js";
import { ParticipantsService } from "../participants/participants.service.js";
import { CreateParticipantDto, UpdateParticipantStatusDto } from "../participants/dto/participant.dto.js";
import { CreateTripDto, TripFiltersDto, UpdateTripDto } from "./dto/trip.dto.js";
import { TripsService } from "./trips.service.js";
import { serializeTripDetail, serializeTripSummary } from "./trips.serializer.js";

@ApiTags("trips")
@Controller("trips")
export class TripsController {
  constructor(
    @Inject(TripsService)
    private readonly tripsService: TripsService,
    @Inject(ParticipantsService)
    private readonly participantsService: ParticipantsService
  ) {}

  @Get()
  async list(@Query() filters: TripFiltersDto) {
    const trips = await this.tripsService.list(filters);
    return trips.map(serializeTripSummary);
  }

  @Get(":slugOrId")
  async get(@Param("slugOrId") slugOrId: string) {
    return serializeTripDetail(await this.tripsService.getBySlugOrId(slugOrId));
  }

  @Post()
  @UseGuards(JwtAuthGuard, TripCreatorGuard)
  @ApiBearerAuth()
  async create(
    @Body() dto: CreateTripDto,
    @Req() request: {
      user: {
        id: string;
        name?: string;
        role: "user" | "admin";
        phone?: string;
        phoneVerified: boolean;
      };
    },
  ) {
    return serializeTripDetail(await this.tripsService.create(dto, request.user));
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, TripCreatorGuard)
  @ApiBearerAuth()
  async update(@Param("id") id: string, @Body() dto: UpdateTripDto) {
    return serializeTripDetail(await this.tripsService.update(id, dto));
  }

  @Post(":id/publish")
  @UseGuards(JwtAuthGuard, TripCreatorGuard)
  @ApiBearerAuth()
  async publish(
    @Param("id") id: string,
    @Req() request: { user: { id: string; role: "user" | "admin" } },
  ) {
    return serializeTripDetail(await this.tripsService.transition(id, "published", request.user));
  }

  @Post(":id/cancel")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async cancel(
    @Param("id") id: string,
    @Req() request: { user: { id: string; role: "user" | "admin" } },
  ) {
    return serializeTripDetail(await this.tripsService.transition(id, "cancelled", request.user));
  }

  @Post(":id/finish")
  @UseGuards(JwtAuthGuard, TripCreatorGuard)
  @ApiBearerAuth()
  async finish(
    @Param("id") id: string,
    @Req() request: { user: { id: string; role: "user" | "admin" } },
  ) {
    return serializeTripDetail(await this.tripsService.transition(id, "finished", request.user));
  }

  @Post(":id/participants")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async join(
    @Param("id") id: string,
    @Req() request: { user: { id: string; name?: string } },
    @Body() dto: Pick<CreateParticipantDto, "comment">,
  ) {
    return this.participantsService.joinTrip(id, {
      userId: request.user.id,
      name: request.user.name ?? "Участник BikeTrips",
      comment: dto.comment,
    });
  }

  @Get(":id/participation")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async participation(
    @Param("id") id: string,
    @Req() request: { user: { id: string } },
  ) {
    return this.participantsService.getForUser(id, request.user.id);
  }

  @Delete(":id/participants/me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async cancelParticipation(
    @Param("id") id: string,
    @Req() request: { user: { id: string } },
  ) {
    return this.participantsService.cancelForUser(id, request.user.id);
  }

  @Get(":id/participants")
  @UseGuards(JwtAuthGuard, TripCreatorGuard)
  @ApiBearerAuth()
  async listParticipants(@Param("id") id: string) {
    return this.participantsService.listForTrip(id);
  }

  @Patch(":id/participants/:participantId")
  @UseGuards(JwtAuthGuard, TripCreatorGuard)
  @ApiBearerAuth()
  async updateParticipant(
    @Param("id") id: string,
    @Param("participantId") participantId: string,
    @Body() dto: UpdateParticipantStatusDto
  ) {
    return this.participantsService.updateStatus(id, participantId, dto.status);
  }
}
