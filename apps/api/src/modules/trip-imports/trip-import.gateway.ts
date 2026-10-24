import Anthropic from "@anthropic-ai/sdk";
import { Injectable } from "@nestjs/common";

import { fetchChannelPosts, type TelegramChannelPost } from "./telegram-channel-preview.js";
import {
  defaultExtractionModel,
  extractTripFromPost,
  type PostExtractionResult,
} from "./trip-post-extraction.js";

const maxCoverBytes = 5_000_000;

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
  private readonly model = process.env.TRIP_IMPORT_MODEL || defaultExtractionModel;

  fetchPosts(handle: string, limit: number): Promise<TelegramChannelPost[]> {
    return fetchChannelPosts(handle, { limit });
  }

  extract(post: TelegramChannelPost): Promise<PostExtractionResult> {
    // Created on first use so the API starts without ANTHROPIC_API_KEY when import is off.
    this.client ??= new Anthropic();
    return extractTripFromPost(this.client, post, this.model);
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
