/**
 * One-off probe: can Qwen3.8 Flash handle our extraction task through the
 * Anthropic-compatible endpoint with a strict JSON Schema?
 *
 * Run: npx tsx src/modules/trip-imports/qwen-anthropic-probe.ts
 * Reads DASHSCOPE_API_KEY and QWEN_BASE_URL from the repo-root .env.
 */
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

import type { TelegramChannelPost } from "./telegram-channel-preview.js";
import {
  extractionSystemPrompt,
  formatPostForPrompt,
  postExtractionSchema,
} from "./trip-post-extraction.js";

// Minimal .env loader so the probe does not depend on Nest config.
const envPath = path.resolve(process.cwd(), "../../.env");
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const match = /^([A-Z_]+)=(.*)$/.exec(line.trim());
  const [, key, value] = match ?? [];
  if (key && value !== undefined && !process.env[key]) process.env[key] = value;
}

const apiKey = process.env.DASHSCOPE_API_KEY;
const baseURL = process.env.QWEN_BASE_URL;
const model = process.env.TRIP_IMPORT_MODEL || "qwen3.8-flash";
if (!apiKey || !baseURL) throw new Error("DASHSCOPE_API_KEY and QWEN_BASE_URL must be set in .env");

const client = new Anthropic({ apiKey, baseURL });

// Zod 4 converts the schema natively; Alibaba requires additionalProperties: false,
// which z.toJSONSchema already emits for z.object schemas.
const jsonSchema = z.toJSONSchema(postExtractionSchema);

// A typical @MskVelo announcement, hardcoded so the probe works without Telegram access.
const post: TelegramChannelPost = {
  channel: "MskVelo",
  messageId: 0,
  url: "https://t.me/MskVelo/0000",
  postedAt: new Date().toISOString(),
  edited: false,
  hasMedia: false,
  coverUrl: null,
  forwardedFrom: null,
  authorSignature: null,
  text: `🚴 Воскресная покатушка в Звенигород!

В эту субботу, 8 ноября, едем классический маршрут Красногорск — Звенигород через лесные грунты. Дистанция ~65 км, темп спокойный 18-20 км/ч, подъёмы есть, но терпимые — новичкам с опытом будет ок.

Сбор в 9:30 у ж/д станции Опалиха, выход к платформе 2. Стартуем в 9:45, не опаздываем!

Покрытие: процентов 80 асфальт, остальное грунт и немного лесных троп. После дождя местами грязь.

С собой: шлем обязательно, запаска, вода, перекус. Обед в кафе в Звенигороде.

Ведёт Андрей @andrey_ep, вопросы в комментарии или в наш чат: [чат покатушек](https://t.me/mskvelo_chat)

Участие бесплатное, 18+`,
};

console.log(`Post: ${post.url}`);
console.log(`Model: ${model}`);
console.log(`Base URL host: ${new URL(baseURL).host}\n`);

const startedAt = Date.now();
const createRaw = client.messages.create.bind(client.messages) as unknown as (
  body: Record<string, unknown>
) => Promise<Anthropic.Message>;
const message = await createRaw({
  model,
  max_tokens: 8000,
  system: [{ type: "text", text: extractionSystemPrompt, cache_control: { type: "ephemeral" } }],
  messages: [{ role: "user", content: formatPostForPrompt(post) }],
  output_config: {
    effort: process.env.PROBE_EFFORT || "medium",
    format: { type: "json_schema", schema: jsonSchema },
  },
});

console.log(`Latency: ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
console.log(`stop_reason: ${message.stop_reason}`);
console.log(`usage: ${JSON.stringify(message.usage)}`);
console.log(
  `content blocks: ${message.content.map((block) => block.type).join(", ")}`
);

const textBlock = message.content.find((block) => block.type === "text");
if (!textBlock || textBlock.type !== "text") {
  console.error("No text block in response");
  process.exit(1);
}

try {
  const parsed = postExtractionSchema.parse(JSON.parse(textBlock.text));
  console.log("\nStrict JSON Schema: OK — response validates against postExtractionSchema");
  console.log(JSON.stringify(parsed, null, 2));
} catch (error) {
  console.error("\nResponse is not valid against the schema:");
  console.error(error instanceof Error ? error.message : error);
  console.error("\nRaw text block:\n", textBlock.text);
  process.exit(1);
}
