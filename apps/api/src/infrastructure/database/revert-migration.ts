import { appDataSource } from "./data-source.js";

await appDataSource.initialize();
await appDataSource.undoLastMigration();
await appDataSource.destroy();
