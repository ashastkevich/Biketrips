import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { ParticipantStatus } from "@biketrips/domain";

import { TripEntity } from "./trip.entity.js";
import { UserEntity } from "./user.entity.js";

@Entity("trip_participants")
@Index(["tripId", "userId"], { unique: true })
export class TripParticipantEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "text" })
  status!: ParticipantStatus;

  @Column({ type: "text" })
  name!: string;

  @Column({ name: "telegram_username", type: "text", nullable: true })
  telegramUsername!: string | null;

  @Column({ type: "text", nullable: true })
  phone!: string | null;

  @Column({ type: "text", nullable: true })
  comment!: string | null;

  @ManyToOne(() => TripEntity, (trip) => trip.participants, { nullable: false })
  @JoinColumn({ name: "trip_id" })
  trip!: TripEntity;

  @Column({ name: "trip_id", type: "uuid" })
  tripId!: string;

  @ManyToOne(() => UserEntity, (user) => user.tripParticipants, { nullable: false })
  @JoinColumn({ name: "user_id" })
  user!: UserEntity;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
