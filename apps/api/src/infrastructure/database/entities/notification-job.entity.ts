import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export type NotificationJobType =
  | "registration_confirmed"
  | "registration_waitlisted"
  | "registration_pending"
  | "registration_approved"
  | "registration_declined"
  | "participant_promoted"
  | "trip_updated"
  | "trip_cancelled"
  | "participant_joined"
  | "moderation_submitted"
  | "trip_approved"
  | "trip_changes_requested"
  | "trip_rejected";

@Entity("notification_jobs")
export class NotificationJobEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "text" })
  channel!: "telegram" | "email";

  @Column({ type: "text" })
  type!: NotificationJobType;

  @Column({ name: "recipient_user_id", type: "uuid", nullable: true })
  recipientUserId!: string | null;

  @Column({ name: "trip_id", type: "uuid", nullable: true })
  tripId!: string | null;

  @Column({ type: "jsonb", default: {} })
  payload!: Record<string, unknown>;

  @Column({ type: "text", default: "queued" })
  status!: "queued" | "processing" | "sent" | "failed" | "skipped";

  @Column({ type: "integer", default: 0 })
  attempts!: number;

  @Column({ name: "run_at", type: "timestamptz", default: () => "now()" })
  runAt!: Date;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
