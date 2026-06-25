import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMvpBackendSchema1737400000000 implements MigrationInterface {
  name = "CreateMvpBackendSchema1737400000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE cities (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        name text NOT NULL,
        slug text NOT NULL UNIQUE,
        timezone text NOT NULL DEFAULT 'Europe/Moscow'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        name text NOT NULL,
        email text,
        avatar_url text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE telegram_accounts (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        telegram_id bigint NOT NULL UNIQUE,
        username text,
        first_name text,
        last_name text,
        photo_url text,
        user_id uuid NOT NULL REFERENCES users(id)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE organizers (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id uuid NOT NULL REFERENCES users(id),
        display_name text NOT NULL,
        bio text,
        contact_url text,
        is_verified boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE trips (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        organizer_id uuid NOT NULL REFERENCES organizers(id),
        city_id uuid NOT NULL REFERENCES cities(id),
        title text NOT NULL,
        description text NOT NULL,
        start_at timestamptz NOT NULL,
        start_location_name text NOT NULL,
        start_lat numeric(9, 6),
        start_lng numeric(9, 6),
        distance_km numeric(6, 1) NOT NULL,
        pace_min integer,
        pace_max integer,
        difficulty text NOT NULL,
        bike_types text NOT NULL,
        surface_types text NOT NULL,
        format text NOT NULL,
        route_description text,
        equipment_requirements text,
        rules text,
        max_participants integer NOT NULL,
        registration_mode text NOT NULL DEFAULT 'automatic',
        status text NOT NULL DEFAULT 'draft',
        public_slug text NOT NULL UNIQUE,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE trip_participants (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        trip_id uuid NOT NULL REFERENCES trips(id),
        user_id uuid NOT NULL REFERENCES users(id),
        status text NOT NULL,
        comment text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (trip_id, user_id)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE waitlist_entries (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        trip_id uuid NOT NULL REFERENCES trips(id),
        user_id uuid NOT NULL REFERENCES users(id),
        position integer NOT NULL,
        promoted_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (trip_id, user_id)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE trip_updates (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        trip_id uuid NOT NULL REFERENCES trips(id),
        title text NOT NULL,
        body text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE notification_jobs (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        channel text NOT NULL,
        type text NOT NULL,
        recipient_user_id uuid,
        trip_id uuid,
        payload jsonb NOT NULL DEFAULT '{}',
        status text NOT NULL DEFAULT 'queued',
        run_at timestamptz NOT NULL DEFAULT now(),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE route_files (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        trip_id uuid NOT NULL REFERENCES trips(id),
        storage_key text NOT NULL,
        original_name text NOT NULL,
        content_type text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE route_files`);
    await queryRunner.query(`DROP TABLE notification_jobs`);
    await queryRunner.query(`DROP TABLE trip_updates`);
    await queryRunner.query(`DROP TABLE waitlist_entries`);
    await queryRunner.query(`DROP TABLE trip_participants`);
    await queryRunner.query(`DROP TABLE trips`);
    await queryRunner.query(`DROP TABLE organizers`);
    await queryRunner.query(`DROP TABLE telegram_accounts`);
    await queryRunner.query(`DROP TABLE users`);
    await queryRunner.query(`DROP TABLE cities`);
  }
}
