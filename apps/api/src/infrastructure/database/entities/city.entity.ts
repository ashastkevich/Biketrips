import { Column, Entity, OneToMany, PrimaryGeneratedColumn, Unique } from "typeorm";

import { TripEntity } from "./trip.entity.js";

@Entity("cities")
@Unique(["slug"])
export class CityEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text" })
  slug!: string;

  @Column({ name: "timezone", type: "text", default: "Europe/Moscow" })
  timezone!: string;

  @OneToMany(() => TripEntity, (trip) => trip.city)
  trips!: TripEntity[];
}
