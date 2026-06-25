import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import {
  bikeTypes,
  difficultyLevels,
  dropPolicies,
  registrationModes,
  surfaceTypes,
  tripStatuses,
  type BikeType,
  type DifficultyLevel,
  type DropPolicy,
  type RegistrationMode,
  type SurfaceType,
  type TripStatus,
} from "@biketrips/domain";

export class CreateTripDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty({ example: "2026-07-04T18:30:00+03:00" })
  @IsDateString()
  startAt!: string;

  @ApiProperty()
  @IsString()
  startLocationName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  startLat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  startLng?: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  distanceKm!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  paceMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  paceMax?: number;

  @ApiProperty({ enum: difficultyLevels })
  @IsIn(difficultyLevels)
  difficulty!: DifficultyLevel;

  @ApiProperty({ enum: bikeTypes })
  @IsIn(bikeTypes)
  bikeType!: BikeType;

  @ApiProperty({ enum: surfaceTypes })
  @IsIn(surfaceTypes)
  surfaceType!: SurfaceType;

  @ApiProperty({ enum: dropPolicies })
  @IsIn(dropPolicies)
  dropPolicy!: DropPolicy;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  routeDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  equipmentRequirements?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rules?: string;

  @ApiProperty({ minimum: 1, maximum: 500 })
  @IsInt()
  @Min(1)
  @Max(500)
  maxParticipants!: number;

  @ApiProperty({ enum: registrationModes, default: "automatic" })
  @IsOptional()
  @IsIn(registrationModes)
  registrationMode?: RegistrationMode;

  @ApiProperty()
  @IsString()
  organizerId!: string;

  @ApiProperty()
  @IsString()
  cityId!: string;
}

export class UpdateTripDto extends PartialType(CreateTripDto) {
  @ApiPropertyOptional({ enum: tripStatuses })
  @IsOptional()
  @IsIn(tripStatuses)
  status?: TripStatus;
}

export class TripFiltersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ enum: difficultyLevels })
  @IsOptional()
  @IsIn(difficultyLevels)
  difficulty?: DifficultyLevel;

  @ApiPropertyOptional({ enum: bikeTypes })
  @IsOptional()
  @IsIn(bikeTypes)
  bikeType?: BikeType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  includeDrafts?: string;
}
