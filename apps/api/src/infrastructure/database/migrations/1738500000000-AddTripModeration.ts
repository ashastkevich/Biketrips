import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddTripModeration1738500000000 implements MigrationInterface {
  name = "AddTripModeration1738500000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE trips
        ADD COLUMN moderation_status text NOT NULL DEFAULT 'draft',
        ADD COLUMN moderation_comment text,
        ADD COLUMN pending_revision jsonb,
        ADD COLUMN pending_cover_storage_key text,
        ADD COLUMN submitted_for_review_at timestamptz,
        ADD COLUMN moderated_at timestamptz,
        ADD COLUMN moderated_by_user_id uuid REFERENCES users(id)
    `);
    await queryRunner.query(`
      UPDATE trips
      SET moderation_status = CASE
        WHEN status IN ('published', 'cancelled', 'finished') THEN 'approved'
        ELSE 'draft'
      END,
      moderated_at = CASE
        WHEN status IN ('published', 'cancelled', 'finished') THEN updated_at
        ELSE NULL
      END
    `);
    await queryRunner.query(`
      CREATE INDEX trips_moderation_queue_idx
      ON trips (moderation_status, submitted_for_review_at)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX trips_moderation_queue_idx`);
    await queryRunner.query(`
      ALTER TABLE trips
        DROP COLUMN moderated_by_user_id,
        DROP COLUMN moderated_at,
        DROP COLUMN submitted_for_review_at,
        DROP COLUMN pending_cover_storage_key,
        DROP COLUMN pending_revision,
        DROP COLUMN moderation_comment,
        DROP COLUMN moderation_status
    `);
  }
}
