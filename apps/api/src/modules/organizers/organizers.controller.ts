import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { OrganizerProfile } from "@biketrips/domain";

import type { OrganizerEntity } from "../../infrastructure/database/entities/organizer.entity.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { UpdateOrganizerProfileDto } from "./dto/update-organizer-profile.dto.js";
import { serializeOrganizerProfile } from "./organizers.serializer.js";
import { OrganizersService } from "./organizers.service.js";

// Organizer profiles appear when a user creates their first trip, so there is no create endpoint.
@ApiTags("organizers")
@Controller("organizers")
export class OrganizersController {
  constructor(@Inject(OrganizersService) private readonly organizersService: OrganizersService) {}

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getMine(@Req() request: { user: { id: string } }): Promise<OrganizerProfile> {
    return this.toProfile(await this.organizersService.getByUserId(request.user.id));
  }

  @Patch("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async updateMine(
    @Req() request: { user: { id: string } },
    @Body() dto: UpdateOrganizerProfileDto,
  ): Promise<OrganizerProfile> {
    return this.toProfile(await this.organizersService.updateBio(request.user.id, dto.bio));
  }

  /** Public: no authentication, and the response never includes contacts. */
  @Get(":id")
  async get(@Param("id", new ParseUUIDPipe()) id: string): Promise<OrganizerProfile> {
    return this.toProfile(await this.organizersService.get(id));
  }

  private async toProfile(organizer: OrganizerEntity): Promise<OrganizerProfile> {
    return serializeOrganizerProfile(
      organizer,
      await this.organizersService.listPublicTrips(organizer.id),
    );
  }
}
