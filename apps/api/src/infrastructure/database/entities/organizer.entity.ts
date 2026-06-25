import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

import { TripEntity } from "./trip.entity.js";
import { UserEntity } from "./user.entity.js";

@Entity("organizers")
export class OrganizerEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "display_name", type: "text" })
  displayName!: string;

  @Column({ type: "text", nullable: true })
  bio!: string | null;

  @Column({ name: "contact_url", type: "text", nullable: true })
  contactUrl!: string | null;

  @Column({ name: "is_verified", type: "boolean", default: false })
  isVerified!: boolean;

  @ManyToOne(() => UserEntity, (user) => user.organizerProfiles, { nullable: false })
  @JoinColumn({ name: "user_id" })
  user!: UserEntity;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @OneToMany(() => TripEntity, (trip) => trip.organizer)
  trips!: TripEntity[];

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
