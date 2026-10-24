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
  type Relation,
} from "typeorm";
import type {
  DifficultyLevel,
  RegistrationMode,
  TripModerationStatus,
  TripSource,
  UnpavedSurfaceDetail,
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

  // Distance, difficulty and surface are empty only on imported trips ("Не указано").
  @Column({ name: "distance_km", type: "numeric", precision: 6, scale: 1, nullable: true })
  distanceKm!: string | null;

  @Column({ name: "pace_min", type: "integer", nullable: true })
  paceMin!: number | null;

  @Column({ name: "pace_max", type: "integer", nullable: true })
  paceMax!: number | null;

  @Column({ type: "text", nullable: true })
  difficulty!: DifficultyLevel | null;

  @Column({ name: "asphalt_percent", type: "integer", nullable: true })
  asphaltPercent!: number | null;

  @Column({ name: "unpaved_percent", type: "integer", nullable: true })
  unpavedPercent!: number | null;

  @Column({ name: "unpaved_surface_details", type: "text", array: true, default: "{}" })
  unpavedSurfaceDetails!: UnpavedSurfaceDetail[];

  @Column({ name: "route_description", type: "text", nullable: true })
  routeDescription!: string | null;

  @Column({ name: "equipment_requirements", type: "text", nullable: true })
  equipmentRequirements!: string | null;

  @Column({ type: "text", nullable: true })
  rules!: string | null;

  @Column({ name: "max_participants", type: "integer", nullable: true })
  maxParticipants!: number | null;

  @Column({ name: "registration_mode", type: "text", default: "automatic" })
  registrationMode!: RegistrationMode;

  @Column({ name: "cover_image", type: "text", nullable: true })
  coverImage!: string | null;

  @Column({ type: "text", default: "native" })
  source!: TripSource;

  @Column({ name: "source_url", type: "text", nullable: true })
  sourceUrl!: string | null;

  @Column({ name: "external_registration_url", type: "text", nullable: true })
  externalRegistrationUrl!: string | null;

  @Column({ type: "text", default: "draft" })
  status!: TripStatus;

  @Column({ name: "moderation_status", type: "text", default: "draft" })
  moderationStatus!: TripModerationStatus;

  @Column({ name: "moderation_comment", type: "text", nullable: true })
  moderationComment!: string | null;

  @Column({ name: "pending_revision", type: "jsonb", nullable: true })
  pendingRevision!: Record<string, unknown> | null;

  @Column({ name: "pending_cover_storage_key", type: "text", nullable: true })
  pendingCoverStorageKey!: string | null;

  @Column({ name: "submitted_for_review_at", type: "timestamptz", nullable: true })
  submittedForReviewAt!: Date | null;

  @Column({ name: "moderated_at", type: "timestamptz", nullable: true })
  moderatedAt!: Date | null;

  @Column({ name: "moderated_by_user_id", type: "uuid", nullable: true })
  moderatedByUserId!: string | null;

  @Index({ unique: true })
  @Column({ name: "public_slug", type: "text" })
  publicSlug!: string;

  @ManyToOne(() => OrganizerEntity, (organizer) => organizer.trips, { nullable: false })
  @JoinColumn({ name: "organizer_id" })
  organizer!: Relation<OrganizerEntity>;

  @Column({ name: "organizer_id", type: "uuid" })
  organizerId!: string;

  @ManyToOne(() => CityEntity, (city) => city.trips, { nullable: false })
  @JoinColumn({ name: "city_id" })
  city!: Relation<CityEntity>;

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
