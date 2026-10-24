import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
  type Relation,
} from "typeorm";

import type { ImportedPostStatus } from "@biketrips/domain";

import { ImportSourceEntity } from "./import-source.entity.js";
import { TripEntity } from "./trip.entity.js";

/** One channel post seen by the importer, with what the model made of it. */
@Entity("imported_posts")
@Unique(["sourceId", "messageId"])
export class ImportedPostEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => ImportSourceEntity, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "source_id" })
  source!: Relation<ImportSourceEntity>;

  @Column({ name: "source_id", type: "uuid" })
  sourceId!: string;

  @Column({ name: "message_id", type: "integer" })
  messageId!: number;

  @Column({ type: "text" })
  url!: string;

  @Column({ name: "posted_at", type: "timestamptz" })
  postedAt!: Date;

  @Column({ type: "text" })
  text!: string;

  /** Edits are detected by comparing this hash with the post text on the next run. */
  @Column({ name: "text_hash", type: "text" })
  textHash!: string;

  @Column({ name: "cover_url", type: "text", nullable: true })
  coverUrl!: string | null;

  @Column({ type: "text", nullable: true })
  kind!: string | null;

  @Column({ type: "jsonb", nullable: true })
  extraction!: Record<string, unknown> | null;

  @Column({ type: "text" })
  status!: ImportedPostStatus;

  @Column({ name: "skip_reason", type: "text", nullable: true })
  skipReason!: string | null;

  @ManyToOne(() => TripEntity, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "trip_id" })
  trip!: Relation<TripEntity> | null;

  @Column({ name: "trip_id", type: "uuid", nullable: true })
  tripId!: string | null;

  @Column({ name: "extracted_at", type: "timestamptz", nullable: true })
  extractedAt!: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
