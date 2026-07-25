import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("telegram_login_nonces")
@Index(["status", "expiresAt"])
@Index(["startTokenHash"], { unique: true })
export class TelegramLoginNonceEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "start_token_hash", type: "text" })
  startTokenHash!: string;

  @Column({ name: "poll_token_hash", type: "text" })
  pollTokenHash!: string;

  @Column({ name: "requested_user_id", type: "uuid", nullable: true })
  requestedUserId!: string | null;

  @Column({ type: "text", default: "pending" })
  status!: "pending" | "confirmed" | "consumed";

  @Column({ name: "confirmed_user_id", type: "uuid", nullable: true })
  confirmedUserId!: string | null;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt!: Date;

  @Column({ name: "confirmed_at", type: "timestamptz", nullable: true })
  confirmedAt!: Date | null;

  @Column({ name: "consumed_at", type: "timestamptz", nullable: true })
  consumedAt!: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
