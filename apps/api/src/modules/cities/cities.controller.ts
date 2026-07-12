import { Controller, Get, Inject } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { CitiesService } from "./cities.service.js";

@ApiTags("cities")
@Controller("cities")
export class CitiesController {
  constructor(@Inject(CitiesService) private readonly citiesService: CitiesService) {}

  @Get()
  async list() {
    return this.citiesService.list();
  }
}
