import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserAccessFields1737500000000 implements MigrationInterface {
  name = "AddUserAccessFields1737500000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        ADD COLUMN role text NOT NULL DEFAULT 'user',
        ADD COLUMN phone_number text,
        ADD COLUMN phone_verified_at timestamptz,
        ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'))
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        DROP CONSTRAINT users_role_check,
        DROP COLUMN phone_verified_at,
        DROP COLUMN phone_number,
        DROP COLUMN role
    `);
  }
}
