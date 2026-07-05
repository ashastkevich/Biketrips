import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddSurfaceCompositionFields1737600000000 implements MigrationInterface {
  name = "AddSurfaceCompositionFields1737600000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE trips
        ADD COLUMN IF NOT EXISTS asphalt_percent integer NOT NULL DEFAULT 100,
        ADD COLUMN IF NOT EXISTS unpaved_percent integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS unpaved_surface_details text[] NOT NULL DEFAULT '{}'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE trips
        DROP COLUMN IF EXISTS unpaved_surface_details,
        DROP COLUMN IF EXISTS unpaved_percent,
        DROP COLUMN IF EXISTS asphalt_percent
    `);
  }
}
