/**
 * Benchmark: run 10 real @MskVelo posts through qwen3.8-flash in one reasoning mode
 * (medium | low | disabled) and compare against the saved Haiku validation run.
 *
 * Run: PROBE_MODE=medium npx tsx src/modules/trip-imports/qwen-effort-benchmark.ts
 */
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

import type { TelegramChannelPost } from "./telegram-channel-preview.js";
import {
  extractionSystemPrompt,
  formatPostForPrompt,
  postExtractionSchema,
  type PostExtraction,
} from "./trip-post-extraction.js";

const envPath = path.resolve(process.cwd(), "../../.env");
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const match = /^([A-Z_]+)=(.*)$/.exec(line.trim());
  const [, key, value] = match ?? [];
  if (key && value !== undefined && !process.env[key]) process.env[key] = value;
}

const mode = process.env.PROBE_MODE;
if (!mode || !["medium", "low", "disabled"].includes(mode))
  throw new Error("Set PROBE_MODE to medium, low or disabled");

const client = new Anthropic({
  apiKey: process.env.DASHSCOPE_API_KEY!,
  baseURL: process.env.QWEN_BASE_URL!,
});
const model = "qwen3.8-flash";
const jsonSchema = z.toJSONSchema(postExtractionSchema);

interface ReportEntry {
  post: TelegramChannelPost & { messageId?: number };
  result?: { extraction?: PostExtraction | null };
}

const reportPath = path.resolve(process.cwd(), "storage/import-reports/MskVelo-2026-10-20-haiku.json");
const haikuEntries = (JSON.parse(readFileSync(reportPath, "utf8")) as ReportEntry[]).filter(
  (entry) => entry.post?.text && entry.post.text.length > 100
);
const sample = haikuEntries.slice(0, 10);
console.log(`Mode: ${mode} | Posts: ${sample.length} | Model: ${model}\n`);

const keyFields = (extraction: PostExtraction | null | undefined) => {
  const trip = extraction?.trip;
  if (!extraction || !trip) return { kind: extraction?.kind ?? "none" };
  return {
    kind: extraction.kind,
    title: trip.title,
    startDate: trip.startDate,
    startTime: trip.startTime,
    startLocationName: trip.startLocationName,
    distanceKm: trip.distanceKm,
    pace: [trip.paceMinKmh, trip.paceMaxKmh],
    surface: [trip.asphaltPercent, trip.unpavedPercent],
    difficulty: trip.difficulty,
    confidence: extraction.confidence,
  };
};

const results: unknown[] = [];
for (const [index, entry] of sample.entries()) {
  const post = entry.post;
  const startedAt = Date.now();
  try {
    const body: Record<string, unknown> = {
      model,
      max_tokens: 8000,
      system: [
        { type: "text", text: extractionSystemPrompt, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: formatPostForPrompt(post) }],
      output_config: {
        effort: mode === "disabled" ? "low" : mode,
        format: { type: "json_schema", schema: jsonSchema },
      },
    };
    if (mode === "disabled") body.thinking = { type: "disabled" };

    const createRaw = client.messages.create.bind(client.messages) as unknown as (
      payload: Record<string, unknown>
    ) => Promise<Anthropic.Message>;
    const message = await createRaw(body);
    const textBlock = message.content.find((block) => block.type === "text");
    const raw = textBlock && textBlock.type === "text" ? textBlock.text : "";
    const extraction = postExtractionSchema.parse(JSON.parse(raw));
    const latency = ((Date.now() - startedAt) / 1000).toFixed(1);

    results.push({
      url: post.url,
      haiku: keyFields(entry.result?.extraction),
      qwen: keyFields(extraction),
      qwenNotes: extraction.notes,
      usage: message.usage,
      latencySeconds: Number(latency),
      error: null,
    });
    console.log(
      `${index + 1}/10 ${post.url} — ok, ${extraction.kind}, ${message.usage.output_tokens} out tokens, ${latency}s`
    );
  } catch (error) {
    results.push({
      url: post.url,
      haiku: keyFields(entry.result?.extraction),
      qwen: null,
      error: error instanceof Error ? error.message.slice(0, 500) : String(error),
    });
    console.log(`${index + 1}/10 ${post.url} — ERROR: ${String(error).slice(0, 200)}`);
  }
}

const outPath = path.resolve(
  process.cwd(),
  `storage/import-reports/qwen-benchmark-${mode}.json`
);
writeFileSync(outPath, JSON.stringify(results, null, 2));
console.log(`\nSaved: ${outPath}`);
