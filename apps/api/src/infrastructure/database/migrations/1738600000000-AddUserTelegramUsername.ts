import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserTelegramUsername1738600000000 implements MigrationInterface {
  name = "AddUserTelegramUsername1738600000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "telegram_username" text`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "telegram_username"`);
  }
}
