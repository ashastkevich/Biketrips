import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type {
  BikeType,
  DifficultyLevel,
  DropPolicy,
  RegistrationMode,
  SurfaceType,
  TripStatus,
} from "@biketrips/domain";

import { CityEntity } from "./city.entity.js";
import { OrganizerEntity } from "./organizer.entity.js";
import { RouteFileEntity } from "./route-file.entity.js";
import { TripParticipantEntity } from "./trip-participant.entity.js";
import { TripUpdateEntity } from "./trip-update.entity.js";
import { WaitlistEntryEntity } from "./waitlist-entry.entity.js";

@Entity("trips")
export class TripEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "text" })
  title!: string;

  @Column({ type: "text" })
  description!: string;

  @Column({ name: "start_at", type: "timestamptz" })
  startAt!: Date;

  @Column({ name: "start_location_name", type: "text" })
  startLocationName!: string;

  @Column({ name: "start_lat", type: "numeric", precision: 9, scale: 6, nullable: true })
  startLat!: string | null;

  @Column({ name: "start_lng", type: "numeric", precision: 9, scale: 6, nullable: true })
  startLng!: string | null;

  @Column({ name: "distance_km", type: "numeric", precision: 6, scale: 1 })
  distanceKm!: string;

  @Column({ name: "pace_min", type: "integer", nullable: true })
  paceMin!: number | null;

  @Column({ name: "pace_max", type: "integer", nullable: true })
  paceMax!: number | null;

  @Column({ type: "text" })
  difficulty!: DifficultyLevel;

  @Column({ name: "bike_type", type: "text" })
  bikeType!: BikeType;

  @Column({ name: "surface_type", type: "text" })
  surfaceType!: SurfaceType;

  @Column({ name: "drop_policy", type: "text" })
  dropPolicy!: DropPolicy;

  @Column({ name: "route_description", type: "text", nullable: true })
  routeDescription!: string | null;

  @Column({ name: "equipment_requirements", type: "text", nullable: true })
  equipmentRequirements!: string | null;

  @Column({ type: "text", nullable: true })
  rules!: string | null;

  @Column({ name: "max_participants", type: "integer" })
  maxParticipants!: number;

  @Column({ name: "registration_mode", type: "text", default: "automatic" })
  registrationMode!: RegistrationMode;

  @Column({ type: "text", default: "draft" })
  status!: TripStatus;

  @Index({ unique: true })
  @Column({ name: "public_slug", type: "text" })
  publicSlug!: string;

  @ManyToOne(() => OrganizerEntity, (organizer) => organizer.trips, { nullable: false })
  @JoinColumn({ name: "organizer_id" })
  organizer!: OrganizerEntity;

  @Column({ name: "organizer_id", type: "uuid" })
  organizerId!: string;

  @ManyToOne(() => CityEntity, (city) => city.trips, { nullable: false })
  @JoinColumn({ name: "city_id" })
  city!: CityEntity;

  @Column({ name: "city_id", type: "uuid" })
  cityId!: string;

  @OneToMany(() => TripParticipantEntity, (participant) => participant.trip)
  participants!: TripParticipantEntity[];

  @OneToMany(() => WaitlistEntryEntity, (entry) => entry.trip)
  waitlistEntries!: WaitlistEntryEntity[];

  @OneToMany(() => TripUpdateEntity, (update) => update.trip)
  updates!: TripUpdateEntity[];

  @OneToMany(() => RouteFileEntity, (routeFile) => routeFile.trip)
  routeFiles!: RouteFileEntity[];

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
