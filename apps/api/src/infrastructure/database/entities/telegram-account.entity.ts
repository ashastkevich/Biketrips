import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";

import { UserEntity } from "./user.entity.js";

@Entity("telegram_accounts")
@Unique(["telegramId"])
export class TelegramAccountEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "telegram_id", type: "bigint" })
  telegramId!: string;

  @Column({ type: "text", nullable: true })
  username!: string | null;

  @Column({ name: "first_name", type: "text", nullable: true })
  firstName!: string | null;

  @Column({ name: "last_name", type: "text", nullable: true })
  lastName!: string | null;

  @Column({ name: "photo_url", type: "text", nullable: true })
  photoUrl!: string | null;

  @ManyToOne(() => UserEntity, (user) => user.telegramAccounts, { nullable: false })
  @JoinColumn({ name: "user_id" })
  user!: UserEntity;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;
}
