import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddImportedTripOrganizers1739300000000 implements MigrationInterface {
  name = "AddImportedTripOrganizers1739300000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE organizers
        ADD COLUMN telegram_username text,
        ADD COLUMN is_claimed boolean NOT NULL DEFAULT true
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX organizers_telegram_username_idx ON organizers (telegram_username) WHERE telegram_username IS NOT NULL`
    );
    // Trips imported before this stay without a named organizer.
    await queryRunner.query(`
      ALTER TABLE trips
        ADD COLUMN imported_organizer_id uuid REFERENCES organizers(id) ON DELETE SET NULL
    `);
    await queryRunner.query(
      `CREATE INDEX trips_imported_organizer_idx ON trips (imported_organizer_id) WHERE imported_organizer_id IS NOT NULL`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE trips DROP COLUMN imported_organizer_id`);
    // Placeholder profiles and their users exist only for imported trips.
    const placeholders: { id: string; user_id: string }[] = await queryRunner.query(
      `SELECT id, user_id FROM organizers WHERE is_claimed = false`
    );
    for (const { id, user_id: userId } of placeholders) {
      await queryRunner.query(`DELETE FROM organizers WHERE id = $1`, [id]);
      await queryRunner.query(`DELETE FROM users WHERE id = $1`, [userId]);
    }
    await queryRunner.query(`DROP INDEX organizers_telegram_username_idx`);
    await queryRunner.query(`
      ALTER TABLE organizers
        DROP COLUMN is_claimed,
        DROP COLUMN telegram_username
    `);
  }
}
