import { appDataSource } from "./data-source.js";

await appDataSource.initialize();
await appDataSource.runMigrations();
await appDataSource.destroy();
