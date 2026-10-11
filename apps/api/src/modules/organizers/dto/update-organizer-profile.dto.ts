import { organizerBioMaxLength } from "@biketrips/domain";
import { IsString, MaxLength } from "class-validator";

export class UpdateOrganizerProfileDto {
  @IsString()
  @MaxLength(organizerBioMaxLength)
  bio!: string;
}
