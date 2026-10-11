import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmailCodeRequestIp1738900000000 implements MigrationInterface {
  name = "AddEmailCodeRequestIp1738900000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "email_auth_codes" ADD "request_ip" text`);
    await queryRunner.query(
      `CREATE INDEX "email_auth_codes_email_created_idx" ON "email_auth_codes" ("email", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "email_auth_codes_ip_created_idx" ON "email_auth_codes" ("request_ip", "created_at")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "email_auth_codes_ip_created_idx"`);
    await queryRunner.query(`DROP INDEX "email_auth_codes_email_created_idx"`);
    await queryRunner.query(`ALTER TABLE "email_auth_codes" DROP COLUMN "request_ip"`);
  }
}
