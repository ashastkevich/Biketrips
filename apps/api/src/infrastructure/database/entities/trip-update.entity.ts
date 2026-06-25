import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

import { TripEntity } from "./trip.entity.js";

@Entity("trip_updates")
export class TripUpdateEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "text" })
  title!: string;

  @Column({ type: "text" })
  body!: string;

  @ManyToOne(() => TripEntity, (trip) => trip.updates, { nullable: false })
  @JoinColumn({ name: "trip_id" })
  trip!: TripEntity;

  @Column({ name: "trip_id", type: "uuid" })
  tripId!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
