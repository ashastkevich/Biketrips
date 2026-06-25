import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

import { OrganizerEntity } from "./organizer.entity.js";
import { TelegramAccountEntity } from "./telegram-account.entity.js";
import { TripParticipantEntity } from "./trip-participant.entity.js";

@Entity("users")
export class UserEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text", nullable: true })
  email!: string | null;

  @Column({ name: "avatar_url", type: "text", nullable: true })
  avatarUrl!: string | null;

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
