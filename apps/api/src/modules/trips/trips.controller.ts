import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { TripCreatorGuard } from "../auth/access.guards.js";
import { ParticipantsService } from "../participants/participants.service.js";
import { CreateParticipantDto, UpdateParticipantStatusDto } from "../participants/dto/participant.dto.js";
import { CreateTripDto, TripFiltersDto, UpdateTripDto } from "./dto/trip.dto.js";
import { type UploadedCoverImage, type UploadedRouteFile, TripsService } from "./trips.service.js";
import { serializeTripDetail, serializeTripSummary } from "./trips.serializer.js";

interface MultipartTripBody {
  payload?: string;
  removeRouteFile?: string;
}

interface HeaderResponse {
  setHeader(name: string, value: string): void;
}

const maxCoverImageBytes = 5_000_000;

interface MultipartTripFiles {
  routeGpxFile?: UploadedRouteFile[];
  coverImageFile?: UploadedCoverImage[];
}

const multipartTripFilesInterceptor = FileFieldsInterceptor(
  [
    { name: "routeGpxFile", maxCount: 1 },
    { name: "coverImageFile", maxCount: 1 },
  ],
  { limits: { fileSize: maxCoverImageBytes } },
);

function parseTripPayload<TPayload>(body: MultipartTripBody): TPayload {
  if (!body.payload) {
    throw new BadRequestException("Multipart trip payload is required");
  }

  try {
    return JSON.parse(body.payload) as TPayload;
  } catch {
    throw new BadRequestException("Multipart trip payload must be valid JSON");
  }
}

function encodeDownloadFileName(fileName: string): string {
  return encodeURIComponent(fileName)
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A");
}

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

  @Get(":id/route-file")
  async downloadRouteFile(
    @Param("id") id: string,
    @Res({ passthrough: true }) response: HeaderResponse,
  ) {
    const routeFile = await this.tripsService.getRouteFileForDownload(id);
    response.setHeader("Content-Type", routeFile.contentType);
    response.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeDownloadFileName(routeFile.fileName)}`,
    );

    return new StreamableFile(routeFile.content);
  }

  @Get(":id/cover-image")
  async downloadCoverImage(
    @Param("id") id: string,
    @Res({ passthrough: true }) response: HeaderResponse,
  ) {
    const coverImage = await this.tripsService.getCoverImageForDownload(id);
    response.setHeader("Content-Type", coverImage.contentType);
    response.setHeader("Cache-Control", "public, max-age=3600");

    return new StreamableFile(coverImage.content);
  }

  @Get(":slugOrId")
  async get(@Param("slugOrId") slugOrId: string) {
    return serializeTripDetail(await this.tripsService.getBySlugOrId(slugOrId));
  }

  @Post("with-route-file")
  @UseGuards(JwtAuthGuard, TripCreatorGuard)
  @UseInterceptors(multipartTripFilesInterceptor)
  @ApiBearerAuth()
  async createWithRouteFile(
    @UploadedFiles() files: MultipartTripFiles | undefined,
    @Body() body: MultipartTripBody,
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
    return serializeTripDetail(
      await this.tripsService.createWithRouteFile(
        parseTripPayload<CreateTripDto>(body),
        files?.routeGpxFile?.[0],
        files?.coverImageFile?.[0],
        request.user,
      ),
    );
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

  @Patch(":id/with-route-file")
  @UseGuards(JwtAuthGuard, TripCreatorGuard)
  @UseInterceptors(multipartTripFilesInterceptor)
  @ApiBearerAuth()
  async updateWithRouteFile(
    @Param("id") id: string,
    @UploadedFiles() files: MultipartTripFiles | undefined,
    @Body() body: MultipartTripBody,
    @Req() request: { user: { id: string; role: "user" | "admin" } },
  ) {
    return serializeTripDetail(
      await this.tripsService.updateWithRouteFile(
        id,
        parseTripPayload<UpdateTripDto>(body),
        files?.routeGpxFile?.[0],
        files?.coverImageFile?.[0],
        body.removeRouteFile === "true",
        request.user,
      ),
    );
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, TripCreatorGuard)
  @ApiBearerAuth()
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateTripDto,
    @Req() request: { user: { id: string; role: "user" | "admin" } },
  ) {
    return serializeTripDetail(await this.tripsService.update(id, dto, request.user));
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
