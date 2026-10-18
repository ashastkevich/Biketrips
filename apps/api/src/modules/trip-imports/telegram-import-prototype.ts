// Prototype of importing rides from public Telegram channels. It reads recent
// posts, extracts trips with Claude and writes a Markdown + JSON report for
// manual review. Nothing is written to the database.
//
//   npm run import:telegram-prototype -w @biketrips/api -- --channel MskVelo --limit 30

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import Anthropic from "@anthropic-ai/sdk";

import { renderReport, type ReportEntry } from "./import-report.js";
import { fetchChannelPosts } from "./telegram-channel-preview.js";
import {
  buildTripDraft,
  defaultExtractionModel,
  extractTripFromPost,
} from "./trip-post-extraction.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
for (const envFile of [
  resolve(currentDir, "../../../../../.env"),
  resolve(currentDir, "../../../.env"),
]) {
  if (existsSync(envFile)) loadEnvFile(envFile);
}

const { values: args } = parseArgs({
  options: {
    channel: { type: "string", default: "MskVelo" },
    limit: { type: "string", default: "30" },
    model: { type: "string", default: process.env.TRIP_IMPORT_MODEL || defaultExtractionModel },
    concurrency: { type: "string", default: "4" },
    out: { type: "string", default: "storage/import-reports" },
  },
});

const channel = args.channel.replace(/^@/, "");
const limit = Number(args.limit);
const concurrency = Number(args.concurrency);

console.log(`Fetching up to ${limit} posts from https://t.me/s/${channel} ...`);
const posts = await fetchChannelPosts(channel, { limit });
console.log(`Got ${posts.length} posts, extracting with ${args.model} ...`);

const client = new Anthropic();
const entries = await mapWithConcurrency(posts, concurrency, async (post): Promise<ReportEntry> => {
  if (!post.text) return { post, result: null, error: "Пост без текста", draft: null };

  try {
    const result = await extractTripFromPost(client, post, args.model);
    const trip = result.extraction?.trip;
    console.log(`  ${post.url}: ${result.extraction?.kind ?? result.stopReason}`);
    return { post, result, error: null, draft: trip ? buildTripDraft(post, trip) : null };
  } catch (error) {
    const message =
      error instanceof Anthropic.APIError ? `API ${error.status}: ${error.message}` : String(error);
    console.error(`  ${post.url}: ${message}`);
    return { post, result: null, error: message, draft: null };
  }
});

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outDir = resolve(args.out);
mkdirSync(outDir, { recursive: true });
const baseName = `${channel}-${stamp}`;
writeFileSync(resolve(outDir, `${baseName}.json`), JSON.stringify(entries, null, 2));
writeFileSync(resolve(outDir, `${baseName}.md`), renderReport(channel, args.model, entries));
console.log(`Report: ${resolve(outDir, `${baseName}.md`)}`);

async function mapWithConcurrency<T, R>(
  items: T[],
  size: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index] as T);
    }
  });
  await Promise.all(workers);
  return results;
}
