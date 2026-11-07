/**
 * Re-extracts two real imported posts with the updated organizer rules
 * to verify clubName/leaderUsernames behavior. Read-only: nothing is written.
 *
 * Run: npx tsx src/modules/trip-imports/qwen-organizer-probe.ts
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

import { createExtractionClient } from "./trip-import.gateway.js";
import { extractTripFromPost, resolveExtractionModel } from "./trip-post-extraction.js";

const envPath = path.resolve(process.cwd(), "../../.env");
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const match = /^([A-Z_]+)=(.*)$/.exec(line.trim());
  const [, key, value] = match ?? [];
  if (key && value !== undefined && !process.env[key]) process.env[key] = value;
}

const urls = process.argv.slice(2);
if (urls.length === 0) throw new Error("Pass post URLs as arguments");

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgres://biketrips:biketrips@localhost:5432/biketrips",
});
const { rows } = await pool.query(
  `SELECT p.url, p.text, p.posted_at, s.handle
   FROM imported_posts p JOIN import_sources s ON s.id = p.source_id
   WHERE p.url = ANY($1)`,
  [urls]
);
await pool.end();
if (rows.length === 0) throw new Error("Posts not found in imported_posts");

const client = createExtractionClient("qwen");
const model = resolveExtractionModel();

for (const row of rows) {
  const result = await extractTripFromPost(
    client,
    {
      channel: row.handle,
      messageId: 0,
      url: row.url,
      postedAt: new Date(row.posted_at).toISOString(),
      edited: false,
      hasMedia: false,
      coverUrl: null,
      forwardedFrom: null,
      authorSignature: null,
      text: row.text,
    },
    { model, provider: "qwen" }
  );
  const trip = result.extraction?.trip;
  console.log(`\n${row.url}`);
  console.log(`  clubName:         ${trip?.clubName}`);
  console.log(`  leaderUsernames:  ${JSON.stringify(trip?.leaderUsernames)}`);
  console.log(`  leaderName:       ${trip?.leaderName}`);
}
