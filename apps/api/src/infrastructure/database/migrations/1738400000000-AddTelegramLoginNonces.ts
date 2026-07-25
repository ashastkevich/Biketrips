import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddTelegramLoginNonces1738400000000 implements MigrationInterface {
  name = "AddTelegramLoginNonces1738400000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE telegram_login_nonces (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        start_token_hash text NOT NULL UNIQUE,
        poll_token_hash text NOT NULL,
        requested_user_id uuid REFERENCES users(id),
        status text NOT NULL DEFAULT 'pending',
        confirmed_user_id uuid REFERENCES users(id),
        expires_at timestamptz NOT NULL,
        confirmed_at timestamptz,
        consumed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT telegram_login_nonces_status_check
          CHECK (status IN ('pending', 'confirmed', 'consumed'))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX telegram_login_nonces_status_expires_idx
        ON telegram_login_nonces (status, expires_at)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX telegram_login_nonces_status_expires_idx`);
    await queryRunner.query(`DROP TABLE telegram_login_nonces`);
  }
}
