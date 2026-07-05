import type { MigrationInterface, QueryRunner } from "typeorm";

export class MakeTripParticipantLimitOptional1737900000000 implements MigrationInterface {
  name = "MakeTripParticipantLimitOptional1737900000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE trips ALTER COLUMN max_participants DROP NOT NULL"
    );
    await queryRunner.query(
      "UPDATE trips SET max_participants = NULL WHERE max_participants = 500"
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "UPDATE trips SET max_participants = 500 WHERE max_participants IS NULL"
    );
    await queryRunner.query(
      "ALTER TABLE trips ALTER COLUMN max_participants SET NOT NULL"
    );
  }
}
