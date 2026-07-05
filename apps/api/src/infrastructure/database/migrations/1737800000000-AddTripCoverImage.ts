import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddTripCoverImage1737800000000 implements MigrationInterface {
  name = "AddTripCoverImage1737800000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE trips
        ADD COLUMN IF NOT EXISTS cover_image text
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE trips
        DROP COLUMN IF EXISTS cover_image
    `);
  }
}
