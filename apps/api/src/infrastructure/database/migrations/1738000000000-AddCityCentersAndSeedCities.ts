import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddCityCentersAndSeedCities1738000000000 implements MigrationInterface {
  name = "AddCityCentersAndSeedCities1738000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cities
      ADD COLUMN center_lat numeric(9, 6),
      ADD COLUMN center_lng numeric(9, 6)
    `);
    await queryRunner.query(`
      INSERT INTO cities (id, name, slug, timezone, center_lat, center_lng)
      VALUES
        (
          '10000000-0000-4000-8000-000000000001',
          'Москва',
          'moscow',
          'Europe/Moscow',
          55.755864,
          37.617698
        ),
        (
          '10000000-0000-4000-8000-000000000002',
          'Санкт-Петербург',
          'saint-petersburg',
          'Europe/Moscow',
          59.939095,
          30.315868
        )
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        timezone = EXCLUDED.timezone,
        center_lat = EXCLUDED.center_lat,
        center_lng = EXCLUDED.center_lng
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cities
      DROP COLUMN center_lng,
      DROP COLUMN center_lat
    `);
  }
}
