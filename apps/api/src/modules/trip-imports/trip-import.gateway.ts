import Anthropic from "@anthropic-ai/sdk";
import { Injectable } from "@nestjs/common";

import { fetchChannelPosts, type TelegramChannelPost } from "./telegram-channel-preview.js";
import {
  extractTripFromPost,
  resolveExtractionModel,
  resolveExtractionProvider,
  type ExtractionProvider,
  type PostExtractionResult,
} from "./trip-post-extraction.js";

const maxCoverBytes = 5_000_000;

/** Both providers speak the Anthropic Messages API; Qwen just needs Alibaba's base URL. */
export function createExtractionClient(provider: ExtractionProvider): Anthropic {
  if (provider !== "qwen") return new Anthropic();
  const apiKey = process.env.DASHSCOPE_API_KEY;
  const baseURL = process.env.QWEN_BASE_URL;
  if (!apiKey || !baseURL)
    throw new Error("DASHSCOPE_API_KEY and QWEN_BASE_URL must be set when TRIP_IMPORT_PROVIDER=qwen");
  return new Anthropic({ apiKey, baseURL });
}

export interface DownloadedImage {
  contentType: string;
  buffer: Buffer;
}

/** Everything the importer needs from the outside world, so tests can replace it. */
export abstract class TripImportGateway {
  abstract fetchPosts(handle: string, limit: number): Promise<TelegramChannelPost[]>;
  abstract extract(post: TelegramChannelPost): Promise<PostExtractionResult>;
  abstract downloadImage(url: string): Promise<DownloadedImage | null>;
}

@Injectable()
export class TelegramClaudeImportGateway extends TripImportGateway {
  private client: Anthropic | null = null;
  private readonly provider: ExtractionProvider = resolveExtractionProvider();
  private readonly model = resolveExtractionModel();

  fetchPosts(handle: string, limit: number): Promise<TelegramChannelPost[]> {
    return fetchChannelPosts(handle, { limit });
  }

  extract(post: TelegramChannelPost): Promise<PostExtractionResult> {
    // Created on first use so the API starts without the provider key when import is off.
    this.client ??= createExtractionClient(this.provider);
    return extractTripFromPost(this.client, post, { model: this.model, provider: this.provider });
  }

  async downloadImage(url: string): Promise<DownloadedImage | null> {
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
    if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer.byteLength > maxCoverBytes ? null : { contentType, buffer };
  }
}
