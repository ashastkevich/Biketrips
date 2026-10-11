import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddNotificationJobAttempts1739000000000 implements MigrationInterface {
  name = "AddNotificationJobAttempts1739000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "notification_jobs" ADD "attempts" integer NOT NULL DEFAULT 0`);
    // Trip-wide jobs were queued without a recipient and could never be claimed.
    await queryRunner.query(
      `UPDATE "notification_jobs" SET "status" = 'skipped' WHERE "recipient_user_id" IS NULL AND "status" = 'queued'`,
    );
    await queryRunner.query(
      `CREATE INDEX "notification_jobs_trip_type_status_idx" ON "notification_jobs" ("trip_id", "type", "status")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "notification_jobs_trip_type_status_idx"`);
    await queryRunner.query(`ALTER TABLE "notification_jobs" DROP COLUMN "attempts"`);
  }
}
