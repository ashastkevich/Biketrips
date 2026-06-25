import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";
import { participantStatuses, type ParticipantStatus } from "@biketrips/domain";

export class CreateParticipantDto {
  @ApiProperty()
  @IsString()
  userId!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telegramUsername?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}

export class UpdateParticipantStatusDto {
  @ApiProperty({ enum: participantStatuses })
  @IsIn(participantStatuses)
  status!: ParticipantStatus;
}
