import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { ParticipantsService } from "../participants/participants.service.js";
import { CreateParticipantDto, UpdateParticipantStatusDto } from "../participants/dto/participant.dto.js";
import { CreateTripDto, TripFiltersDto, UpdateTripDto } from "./dto/trip.dto.js";
import { TripsService } from "./trips.service.js";
import { serializeTripDetail, serializeTripSummary } from "./trips.serializer.js";

@ApiTags("trips")
@Controller("trips")
export class TripsController {
  constructor(
    private readonly tripsService: TripsService,
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async create(@Body() dto: CreateTripDto) {
    return serializeTripDetail(await this.tripsService.create(dto));
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async update(@Param("id") id: string, @Body() dto: UpdateTripDto) {
    return serializeTripDetail(await this.tripsService.update(id, dto));
  }

  @Post(":id/publish")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async publish(@Param("id") id: string) {
    return serializeTripDetail(await this.tripsService.transition(id, "published"));
  }

  @Post(":id/cancel")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async cancel(@Param("id") id: string) {
    return serializeTripDetail(await this.tripsService.transition(id, "cancelled"));
  }

  @Post(":id/finish")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async finish(@Param("id") id: string) {
    return serializeTripDetail(await this.tripsService.transition(id, "finished"));
  }

  @Post(":id/participants")
  async join(@Param("id") id: string, @Body() dto: CreateParticipantDto) {
    return this.participantsService.joinTrip(id, dto);
  }

  @Get(":id/participants")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async listParticipants(@Param("id") id: string) {
    return this.participantsService.listForTrip(id);
  }

  @Patch(":id/participants/:participantId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async updateParticipant(
    @Param("id") id: string,
    @Param("participantId") participantId: string,
    @Body() dto: UpdateParticipantStatusDto
  ) {
    return this.participantsService.updateStatus(id, participantId, dto.status);
  }
}
