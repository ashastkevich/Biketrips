import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

import { TripEntity } from "./trip.entity.js";

@Entity("route_files")
export class RouteFileEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "storage_key", type: "text" })
  storageKey!: string;

  @Column({ name: "original_name", type: "text" })
  originalName!: string;

  @Column({ name: "content_type", type: "text" })
  contentType!: string;

  @ManyToOne(() => TripEntity, (trip) => trip.routeFiles, { nullable: false })
  @JoinColumn({ name: "trip_id" })
  trip!: TripEntity;

  @Column({ name: "trip_id", type: "uuid" })
  tripId!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
