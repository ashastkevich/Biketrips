import type { MigrationInterface, QueryRunner } from "typeorm";

export class DropTripBikeTypeAndDropPolicy1739100000000 implements MigrationInterface {
  name = "DropTripBikeTypeAndDropPolicy1739100000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "bike_type"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "drop_policy"`);
    // Pending revisions are applied with Object.assign, so stale keys would linger on the entity.
    await queryRunner.query(
      `UPDATE "trips" SET "pending_revision" = "pending_revision" - 'bikeType' - 'dropPolicy' WHERE "pending_revision" IS NOT NULL`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // The web form always sent these defaults, so restoring them matches the dropped data.
    await queryRunner.query(`ALTER TABLE "trips" ADD "bike_type" text NOT NULL DEFAULT 'any'`);
    await queryRunner.query(
      `ALTER TABLE "trips" ADD "drop_policy" text NOT NULL DEFAULT 'no_drop'`
    );
    await queryRunner.query(`ALTER TABLE "trips" ALTER COLUMN "bike_type" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "trips" ALTER COLUMN "drop_policy" DROP DEFAULT`);
  }
}
