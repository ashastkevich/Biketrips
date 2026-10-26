import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn, type Relation } from "typeorm";

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

  // "channel" organizers stand for a Telegram channel that imported trips come from;
  // "club" ones for a club an imported post names.
  @Column({ type: "text", default: "person" })
  kind!: "person" | "channel" | "club";

  /** Lowercase, without "@". Set on profiles the importer creates from a post's leader. */
  @Column({ name: "telegram_username", type: "text", nullable: true })
  telegramUsername!: string | null;

  /** False while the importer's profile still belongs to a placeholder user. */
  @Column({ name: "is_claimed", type: "boolean", default: true })
  isClaimed!: boolean;

  @Column({ name: "is_verified", type: "boolean", default: false })
  isVerified!: boolean;

  @ManyToOne(() => UserEntity, (user) => user.organizerProfiles, { nullable: false })
  @JoinColumn({ name: "user_id" })
  user!: Relation<UserEntity>;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @OneToMany(() => TripEntity, (trip) => trip.organizer)
  trips!: TripEntity[];

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
