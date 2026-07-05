import type { MigrationInterface, QueryRunner } from "typeorm";

export class DropLegacySurfaceType1737700000000 implements MigrationInterface {
  name = "DropLegacySurfaceType1737700000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE trips
        DROP COLUMN IF EXISTS surface_type
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE trips
        ADD COLUMN IF NOT EXISTS surface_type text NOT NULL DEFAULT 'asphalt'
    `);
  }
}
