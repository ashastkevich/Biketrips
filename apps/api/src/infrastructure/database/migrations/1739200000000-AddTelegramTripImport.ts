import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddTelegramTripImport1739200000000 implements MigrationInterface {
  name = "AddTelegramTripImport1739200000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    // Posts often omit distance, difficulty and surface; imported trips keep them empty.
    await queryRunner.query(`
      ALTER TABLE trips
        ALTER COLUMN distance_km DROP NOT NULL,
        ALTER COLUMN difficulty DROP NOT NULL,
        ALTER COLUMN asphalt_percent DROP NOT NULL,
        ALTER COLUMN unpaved_percent DROP NOT NULL,
        ADD COLUMN source text NOT NULL DEFAULT 'native',
        ADD COLUMN source_url text,
        ADD COLUMN external_registration_url text
    `);
    await queryRunner.query(`ALTER TABLE organizers ADD COLUMN kind text NOT NULL DEFAULT 'person'`);

    await queryRunner.query(`
      CREATE TABLE import_sources (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        kind text NOT NULL DEFAULT 'telegram_channel',
        handle text NOT NULL UNIQUE,
        title text NOT NULL,
        organizer_id uuid NOT NULL REFERENCES organizers(id),
        city_id uuid NOT NULL REFERENCES cities(id),
        enabled boolean NOT NULL DEFAULT true,
        last_run_at timestamptz,
        last_error text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE imported_posts (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        source_id uuid NOT NULL REFERENCES import_sources(id) ON DELETE CASCADE,
        message_id integer NOT NULL,
        url text NOT NULL,
        posted_at timestamptz NOT NULL,
        text text NOT NULL,
        text_hash text NOT NULL,
        cover_url text,
        kind text,
        extraction jsonb,
        status text NOT NULL,
        skip_reason text,
        trip_id uuid REFERENCES trips(id) ON DELETE SET NULL,
        extracted_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (source_id, message_id)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX imported_posts_source_posted_idx ON imported_posts (source_id, posted_at DESC)`
    );

    // The channel organizes imported trips. Its system user has no email or Telegram,
    // so nobody can sign in as it and notifications to it are never sent.
    await queryRunner.query(`
      WITH import_user AS (
        INSERT INTO users (name, role) VALUES ('Импорт BikeTrips', 'user') RETURNING id
      ),
      channel_organizer AS (
        INSERT INTO organizers (display_name, contact_url, kind, user_id)
        SELECT 'MskVelo', 'https://t.me/MskVelo', 'channel', id FROM import_user
        RETURNING id
      )
      INSERT INTO import_sources (handle, title, organizer_id, city_id)
      SELECT 'MskVelo', 'МскВело', channel_organizer.id, cities.id
      FROM channel_organizer, cities
      WHERE cities.slug = 'moscow'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE imported_posts`);
    const organizers: { organizer_id: string; user_id: string }[] = await queryRunner.query(
      `SELECT s.organizer_id, o.user_id FROM import_sources s JOIN organizers o ON o.id = s.organizer_id`
    );
    await queryRunner.query(`DROP TABLE import_sources`);
    // Imported trips stay as ordinary trips; empty fields get neutral values to restore NOT NULL.
    await queryRunner.query(`
      UPDATE trips SET
        distance_km = COALESCE(distance_km, 0),
        difficulty = COALESCE(difficulty, 'easy'),
        asphalt_percent = COALESCE(asphalt_percent, 100 - COALESCE(unpaved_percent, 0)),
        unpaved_percent = COALESCE(unpaved_percent, 100 - COALESCE(asphalt_percent, 100))
    `);
    await queryRunner.query(`
      ALTER TABLE trips
        DROP COLUMN external_registration_url,
        DROP COLUMN source_url,
        DROP COLUMN source,
        ALTER COLUMN unpaved_percent SET NOT NULL,
        ALTER COLUMN asphalt_percent SET NOT NULL,
        ALTER COLUMN difficulty SET NOT NULL,
        ALTER COLUMN distance_km SET NOT NULL
    `);
    await queryRunner.query(`ALTER TABLE organizers DROP COLUMN kind`);
    // Channel organizers that still own trips are kept with their system users.
    for (const { organizer_id: organizerId, user_id: userId } of organizers) {
      await queryRunner.query(
        `DELETE FROM organizers WHERE id = $1 AND NOT EXISTS (SELECT 1 FROM trips WHERE organizer_id = $1)`,
        [organizerId]
      );
      await queryRunner.query(
        `DELETE FROM users WHERE id = $1 AND NOT EXISTS (SELECT 1 FROM organizers WHERE user_id = $1)`,
        [userId]
      );
    }
  }
}
