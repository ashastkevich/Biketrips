import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmailAuthCodes1738300000000 implements MigrationInterface {
  name = "AddEmailAuthCodes1738300000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        ADD COLUMN email_verified_at timestamptz
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX users_email_lower_unique
        ON users (lower(email))
        WHERE email IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE TABLE email_auth_codes (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        email text NOT NULL,
        code_hash text NOT NULL,
        attempt_count integer NOT NULL DEFAULT 0,
        expires_at timestamptz NOT NULL,
        used_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX email_auth_codes_lookup_idx
        ON email_auth_codes (email, used_at, expires_at)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX email_auth_codes_lookup_idx`);
    await queryRunner.query(`DROP TABLE email_auth_codes`);
    await queryRunner.query(`DROP INDEX users_email_lower_unique`);
    await queryRunner.query(`
      ALTER TABLE users
        DROP COLUMN email_verified_at
    `);
  }
}
