import type { MigrationInterface, QueryRunner } from "typeorm";

// JIT compilation is meant for long analytical queries. Here it fired on the small trip card
// query (small tables without statistics look huge to the planner) and added ~300 ms per lookup.
export class DisableJit1738800000000 implements MigrationInterface {
  name = "DisableJit1738800000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN EXECUTE format('ALTER DATABASE %I SET jit = off', current_database()); END $$`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN EXECUTE format('ALTER DATABASE %I RESET jit', current_database()); END $$`,
    );
  }
}
