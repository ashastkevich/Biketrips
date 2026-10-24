import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from "typeorm";

import { CityEntity } from "./city.entity.js";
import { OrganizerEntity } from "./organizer.entity.js";

/** A public Telegram channel whose ride announcements are imported as trips. */
@Entity("import_sources")
export class ImportSourceEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "text", default: "telegram_channel" })
  kind!: "telegram_channel";

  /** Channel username without "@", e.g. MskVelo. */
  @Column({ type: "text", unique: true })
  handle!: string;

  @Column({ type: "text" })
  title!: string;

  @ManyToOne(() => OrganizerEntity, { nullable: false })
  @JoinColumn({ name: "organizer_id" })
  organizer!: Relation<OrganizerEntity>;

  @Column({ name: "organizer_id", type: "uuid" })
  organizerId!: string;

  @ManyToOne(() => CityEntity, { nullable: false })
  @JoinColumn({ name: "city_id" })
  city!: Relation<CityEntity>;

  @Column({ name: "city_id", type: "uuid" })
  cityId!: string;

  @Column({ type: "boolean", default: true })
  enabled!: boolean;

  @Column({ name: "last_run_at", type: "timestamptz", nullable: true })
  lastRunAt!: Date | null;

  @Column({ name: "last_error", type: "text", nullable: true })
  lastError!: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
