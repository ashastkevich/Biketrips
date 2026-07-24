import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

import { CityEntity } from "./city.entity.js";
import { OrganizerEntity } from "./organizer.entity.js";
import { TelegramAccountEntity } from "./telegram-account.entity.js";
import { TripParticipantEntity } from "./trip-participant.entity.js";
import type { UserRole } from "@biketrips/domain";

@Entity("users")
export class UserEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text", nullable: true })
  email!: string | null;

  @Column({ name: "email_verified_at", type: "timestamptz", nullable: true })
  emailVerifiedAt!: Date | null;

  @Column({ type: "text", default: "user" })
  role!: UserRole;

  @Column({ name: "phone_number", type: "text", nullable: true })
  phoneNumber!: string | null;

  @Column({ name: "phone_verified_at", type: "timestamptz", nullable: true })
  phoneVerifiedAt!: Date | null;

  @Column({ name: "avatar_url", type: "text", nullable: true })
  avatarUrl!: string | null;

  @Column({ name: "city_id", type: "uuid", nullable: true })
  cityId!: string | null;

  @ManyToOne(() => CityEntity, { nullable: true })
  @JoinColumn({ name: "city_id" })
  city!: CityEntity | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @OneToMany(() => OrganizerEntity, (organizer) => organizer.user)
  organizerProfiles!: OrganizerEntity[];

  @OneToMany(() => TelegramAccountEntity, (account) => account.user)
  telegramAccounts!: TelegramAccountEntity[];

  @OneToMany(() => TripParticipantEntity, (participant) => participant.user)
  tripParticipants!: TripParticipantEntity[];
}
