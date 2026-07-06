import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsDateString,
  IsArray,
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
  unpavedSurfaceDetails,
  tripStatuses,
  type BikeType,
  type DifficultyLevel,
  type DropPolicy,
  type RegistrationMode,
  type UnpavedSurfaceDetail,
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

  @ApiPropertyOptional({ minimum: -90, maximum: 90 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  startLat?: number;

  @ApiPropertyOptional({ minimum: -180, maximum: 180 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
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

  @ApiProperty({ minimum: 0, maximum: 100, example: 70 })
  @IsInt()
  @Min(0)
  @Max(100)
  asphaltPercent!: number;

  @ApiProperty({ minimum: 0, maximum: 100, example: 30 })
  @IsInt()
  @Min(0)
  @Max(100)
  unpavedPercent!: number;

  @ApiPropertyOptional({ enum: unpavedSurfaceDetails, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(unpavedSurfaceDetails, { each: true })
  unpavedSurfaceDetails?: UnpavedSurfaceDetail[];

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

  @ApiPropertyOptional({ minimum: 1, maximum: 500, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  maxParticipants?: number | null;

  @ApiProperty({ enum: registrationModes, default: "automatic" })
  @IsOptional()
  @IsIn(registrationModes)
  registrationMode?: RegistrationMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverImage?: string;

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
