import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserCity1738100000000 implements MigrationInterface {
  name = "AddUserCity1738100000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "city_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_users_city" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_city"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "city_id"`);
  }
}
