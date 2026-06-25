import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

import { TripEntity } from "./trip.entity.js";
import { UserEntity } from "./user.entity.js";

@Entity("waitlist_entries")
@Index(["tripId", "userId"], { unique: true })
export class WaitlistEntryEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "integer" })
  position!: number;

  @Column({ name: "promoted_at", type: "timestamptz", nullable: true })
  promotedAt!: Date | null;

  @ManyToOne(() => TripEntity, (trip) => trip.waitlistEntries, { nullable: false })
  @JoinColumn({ name: "trip_id" })
  trip!: TripEntity;

  @Column({ name: "trip_id", type: "uuid" })
  tripId!: string;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: "user_id" })
  user!: UserEntity;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
