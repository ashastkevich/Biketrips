import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("notification_jobs")
export class NotificationJobEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "text" })
  channel!: "telegram" | "email";

  @Column({ type: "text" })
  type!: "trip_published" | "trip_updated" | "trip_cancelled" | "participant_promoted";

  @Column({ name: "recipient_user_id", type: "uuid", nullable: true })
  recipientUserId!: string | null;

  @Column({ name: "trip_id", type: "uuid", nullable: true })
  tripId!: string | null;

  @Column({ type: "jsonb", default: {} })
  payload!: Record<string, unknown>;

  @Column({ type: "text", default: "queued" })
  status!: "queued" | "processing" | "sent" | "failed";

  @Column({ name: "run_at", type: "timestamptz", default: () => "now()" })
  runAt!: Date;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
