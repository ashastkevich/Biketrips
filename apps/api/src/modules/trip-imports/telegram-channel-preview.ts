import { parse, type HTMLElement } from "node-html-parser";

// Reads public channels through the web preview at https://t.me/s/<channel>.
// It needs no Telegram account, but only sees the posts themselves: comments
// (where organizers often attach GPX tracks) are not available here.

export interface TelegramChannelPost {
  channel: string;
  messageId: number;
  url: string;
  postedAt: string;
  edited: boolean;
  text: string;
  hasMedia: boolean;
  /** The first photo of the post (CDN URL from the preview), used as the trip cover. */
  coverUrl: string | null;
  authorSignature: string | null;
  forwardedFrom: { name: string; url: string | null } | null;
}

export interface FetchChannelPostsOptions {
  limit: number;
  fetchImpl?: typeof fetch;
}

const previewBaseUrl = "https://t.me/s";

export async function fetchChannelPosts(
  channel: string,
  { limit, fetchImpl = fetch }: FetchChannelPostsOptions
): Promise<TelegramChannelPost[]> {
  const postsById = new Map<number, TelegramChannelPost>();
  let before: number | null = null;

  while (postsById.size < limit) {
    const url =
      before === null
        ? `${previewBaseUrl}/${channel}`
        : `${previewBaseUrl}/${channel}?before=${before}`;
    const response = await fetchImpl(url, {
      headers: { "user-agent": "Mozilla/5.0 (BikeTrips import prototype)" },
    });
    if (!response.ok) throw new Error(`Telegram preview ${url} responded with ${response.status}`);

    const page = parseChannelPreviewPage(await response.text());
    const newPosts = page.filter((post) => !postsById.has(post.messageId));
    if (newPosts.length === 0) break;

    for (const post of newPosts) postsById.set(post.messageId, post);
    before = Math.min(...newPosts.map((post) => post.messageId));
  }

  return [...postsById.values()].sort((a, b) => b.messageId - a.messageId).slice(0, limit);
}

export function parseChannelPreviewPage(html: string): TelegramChannelPost[] {
  const root = parse(html);
  const posts: TelegramChannelPost[] = [];

  for (const message of root.querySelectorAll(".tgme_widget_message[data-post]")) {
    const post = parseMessage(message);
    if (post) posts.push(post);
  }

  return posts;
}

function parseMessage(message: HTMLElement): TelegramChannelPost | null {
  const [channel, rawId] = (message.getAttribute("data-post") ?? "").split("/");
  const messageId = Number(rawId);
  const postedAt = message
    .querySelector(".tgme_widget_message_date time")
    ?.getAttribute("datetime");
  if (!channel || !Number.isInteger(messageId) || !postedAt) return null;

  const textElement = message.querySelector(".tgme_widget_message_text");
  const forwardedLink = message.querySelector(".tgme_widget_message_forwarded_from_name");
  const signature = message.querySelector(".tgme_widget_message_from_author")?.text.trim();

  return {
    channel,
    messageId,
    url: `https://t.me/${channel}/${messageId}`,
    postedAt: new Date(postedAt).toISOString(),
    edited: /\bedited\b/.test(message.querySelector(".tgme_widget_message_meta")?.text ?? ""),
    text: textElement ? messageTextToPlainText(textElement) : "",
    hasMedia:
      message.querySelector(
        ".tgme_widget_message_photo_wrap, .tgme_widget_message_video_player, .tgme_widget_message_document"
      ) !== null,
    coverUrl: readBackgroundImageUrl(message.querySelector(".tgme_widget_message_photo_wrap")),
    authorSignature: signature && /\p{L}/u.test(signature) ? signature : null,
    forwardedFrom: forwardedLink
      ? { name: forwardedLink.text.trim(), url: forwardedLink.getAttribute("href") ?? null }
      : null,
  };
}

function readBackgroundImageUrl(element: HTMLElement | null): string | null {
  const style = element?.getAttribute("style") ?? "";
  const url = /background-image:\s*url\(['"]?(https:\/\/[^'")]+)['"]?\)/.exec(style)?.[1];
  return url ?? null;
}

// Keeps the post as written: line breaks, emoji, named links and bold/italic/
// underline/strikethrough. Links become Markdown "[label](url)" so the site can
// render them; announcements often hide the chat or route behind words like
// "тут" or "Маршрут". Hashtag search links stay plain text. Formatting is kept
// as the literal tags <b>, <i>, <u> and <s>, which the site renders and nothing
// else.
export function messageTextToPlainText(element: HTMLElement): string {
  const clone = parse(element.outerHTML);

  for (const link of clone.querySelectorAll("a[href]")) {
    const href = link.getAttribute("href") ?? "";
    const label = link.text.trim();
    const isVisibleUrl =
      label.replace(/^https?:\/\//, "").replace(/\/$/, "") ===
      href.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const isWebLink = /^https?:\/\//i.test(href);
    link.replaceWith(
      escapeHtml(
        isVisibleUrl || !isWebLink || !label
          ? label || href
          : `[${label.replace(/[[\]]/g, "")}](${href.replace(/\(/g, "%28").replace(/\)/g, "%29")})`
      )
    );
  }

  const html = clone.innerHTML
    .replace(/<br\s*\/?>/gi, "\n")
    // Emoji come wrapped in <i class="emoji"><b>…</b></i>; that is not formatting.
    .replace(/<i class="emoji"[^>]*>\s*<b>([^<]*)<\/b>\s*<\/i>/gi, "$1")
    .replace(/<tg-emoji[^>]*>([\s\S]*?)<\/tg-emoji>/gi, "$1")
    // Formatting tags survive text extraction as private-use placeholders.
    .replace(/<(\/?)(b|strong|i|em|u|s|del|strike)>/gi, (_, closing: string, tag: string) =>
      formattingPlaceholder(closing === "/", formattingTags[tag.toLowerCase()] ?? "b")
    );

  return restoreFormatting(parse(html).text)
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const formattingTags: Record<string, "b" | "i" | "u" | "s"> = {
  b: "b",
  strong: "b",
  i: "i",
  em: "i",
  u: "u",
  s: "s",
  del: "s",
  strike: "s",
};
const placeholderTags = ["b", "i", "u", "s"] as const;

function formattingPlaceholder(closing: boolean, tag: (typeof placeholderTags)[number]): string {
  return String.fromCharCode(0xe000 + placeholderTags.indexOf(tag) * 2 + (closing ? 1 : 0));
}

function restoreFormatting(text: string): string {
  let result = text.replace(/[\ue000-\ue007]/g, (placeholder) => {
    const code = placeholder.charCodeAt(0) - 0xe000;
    const tag = placeholderTags[Math.floor(code / 2)];
    return code % 2 === 0 ? `<${tag}>` : `</${tag}>`;
  });
  // Formatting around nothing but spaces carries no meaning.
  for (let previous = ""; previous !== result; ) {
    previous = result;
    result = result.replace(/<([bius])>(\s*)<\/\1>/g, "$2");
  }
  return result;
}

// Attribute values come back still entity-encoded, so "&" is left as is.
function escapeHtml(value: string): string {
  return value.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
