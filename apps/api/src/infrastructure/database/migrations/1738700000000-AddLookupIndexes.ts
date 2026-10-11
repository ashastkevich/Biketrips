import type { MigrationInterface, QueryRunner } from "typeorm";

// Postgres does not index foreign keys on its own; these cover the feed, trip card and
// notification queue lookups.
const indexes = [
  `"trips_status_start_at_idx" ON "trips" ("status", "start_at")`,
  `"trips_city_id_idx" ON "trips" ("city_id")`,
  `"trips_organizer_id_idx" ON "trips" ("organizer_id")`,
  `"organizers_user_id_idx" ON "organizers" ("user_id")`,
  `"trip_updates_trip_id_idx" ON "trip_updates" ("trip_id")`,
  `"route_files_trip_id_idx" ON "route_files" ("trip_id")`,
  `"telegram_accounts_user_id_idx" ON "telegram_accounts" ("user_id")`,
  `"notification_jobs_status_run_at_idx" ON "notification_jobs" ("status", "run_at")`,
];

export class AddLookupIndexes1738700000000 implements MigrationInterface {
  name = "AddLookupIndexes1738700000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const index of indexes) {
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS ${index}`);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const index of indexes) {
      const name = index.slice(0, index.indexOf(" ON "));
      await queryRunner.query(`DROP INDEX IF EXISTS ${name}`);
    }
  }
}
