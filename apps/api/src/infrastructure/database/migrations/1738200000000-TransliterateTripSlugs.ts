import { slugifyTripTitle } from "@biketrips/domain";
import type { MigrationInterface, QueryRunner } from "typeorm";

interface TripSlugRow {
  id: string;
  title: string;
  public_slug: string;
}

export class TransliterateTripSlugs1738200000000 implements MigrationInterface {
  name = "TransliterateTripSlugs1738200000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    const trips = await queryRunner.query(
      `SELECT "id", "title", "public_slug" FROM "trips" ORDER BY "created_at", "id"`,
    ) as TripSlugRow[];
    const tripsToUpdate = trips.filter((trip) => /[а-яё]/i.test(trip.public_slug));
    const usedSlugs = new Set(
      trips
        .filter((trip) => !/[а-яё]/i.test(trip.public_slug))
        .map((trip) => trip.public_slug),
    );

    for (const trip of tripsToUpdate) {
      await queryRunner.query(
        `UPDATE "trips" SET "public_slug" = $1 WHERE "id" = $2`,
        [`slug-migration-${trip.id}`, trip.id],
      );
    }

    for (const trip of tripsToUpdate) {
      const baseSlug = slugifyTripTitle(trip.title) || `trip-${trip.id.slice(0, 8)}`;
      let candidate = baseSlug;
      let suffix = 2;

      while (usedSlugs.has(candidate)) {
        candidate = `${baseSlug}-${suffix}`;
        suffix += 1;
      }

      await queryRunner.query(
        `UPDATE "trips" SET "public_slug" = $1 WHERE "id" = $2`,
        [candidate, trip.id],
      );
      usedSlugs.add(candidate);
    }
  }

  async down(): Promise<void> {
    // Старые кириллические URL намеренно не восстанавливаются.
  }
}
