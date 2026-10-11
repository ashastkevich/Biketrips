import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("email_auth_codes")
@Index(["email", "usedAt", "expiresAt"])
@Index(["email", "createdAt"])
@Index(["requestIp", "createdAt"])
export class EmailAuthCodeEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "text" })
  email!: string;

  @Column({ name: "code_hash", type: "text" })
  codeHash!: string;

  @Column({ name: "attempt_count", type: "integer", default: 0 })
  attemptCount!: number;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt!: Date;

  @Column({ name: "used_at", type: "timestamptz", nullable: true })
  usedAt!: Date | null;

  /** Client address the code was requested from, for per-IP rate limits. */
  @Column({ name: "request_ip", type: "text", nullable: true })
  requestIp!: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
