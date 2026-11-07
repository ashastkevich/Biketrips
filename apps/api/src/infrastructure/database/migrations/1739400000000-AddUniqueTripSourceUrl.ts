import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Backstop against duplicate imported trips: two concurrent import runs once
 * created two trips from the same channel post. The import flow now adopts an
 * existing trip instead, and this index guarantees it at the database level.
 * One post (one URL) maps to at most one trip.
 */
export class AddUniqueTripSourceUrl1739400000000 implements MigrationInterface {
  name = "AddUniqueTripSourceUrl1739400000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX trips_source_url_unique ON trips (source_url) WHERE source_url IS NOT NULL`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX trips_source_url_unique`);
  }
}
