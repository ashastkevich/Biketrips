import { describe, expect, it, vi } from "vitest";

import { fetchChannelPosts, parseChannelPreviewPage } from "./telegram-channel-preview.js";

function messageHtml(id: number, text: string, extra = ""): string {
  return `<div class="tgme_widget_message_wrap"><div class="tgme_widget_message js-widget_message" data-post="MskVelo/${id}">
    ${extra}
    <div class="tgme_widget_message_text js-message_text" dir="auto">${text}</div>
    <div class="tgme_widget_message_footer"><span class="tgme_widget_message_meta">
      <a class="tgme_widget_message_date" href="https://t.me/MskVelo/${id}"><time datetime="2026-10-11T17:31:37+00:00" class="time">20:31</time></a>
    </span></div>
  </div></div>`;
}

describe("parseChannelPreviewPage", () => {
  it("extracts posts with line breaks, link targets and metadata", () => {
    const html = messageHtml(
      19590,
      `<i class="emoji"><b>🗓</b></i> Вт, 13.10 — 19:30<br/>Старт: <a href="https://yandex.ru/maps/?ll=37.5&amp;z=15">Белорусская</a><br/>` +
        `Чат: <a href="https://t.me/gravelmtb">https://t.me/gravelmtb</a>&nbsp;&#33;`,
      `<a class="tgme_widget_message_photo_wrap"></a><span class="tgme_widget_message_from_author">Ольга_SV</span>
       <a class="tgme_widget_message_forwarded_from_name" href="https://t.me/club/5">Клуб</a>`
    );

    expect(parseChannelPreviewPage(html)).toEqual([
      {
        channel: "MskVelo",
        messageId: 19590,
        url: "https://t.me/MskVelo/19590",
        postedAt: "2026-10-11T17:31:37.000Z",
        edited: false,
        text: "🗓 Вт, 13.10 — 19:30\nСтарт: Белорусская [https://yandex.ru/maps/?ll=37.5&z=15]\nЧат: https://t.me/gravelmtb !",
        hasMedia: true,
        authorSignature: "Ольга_SV",
        forwardedFrom: { name: "Клуб", url: "https://t.me/club/5" },
      },
    ]);
  });

  it("skips service messages without a date", () => {
    const html = `<div class="tgme_widget_message" data-post="MskVelo/1"><div class="tgme_widget_message_text">Канал создан</div></div>`;

    expect(parseChannelPreviewPage(html)).toEqual([]);
  });
});

describe("fetchChannelPosts", () => {
  it("pages backwards until the limit is reached", async () => {
    const pages: Record<string, string> = {
      "https://t.me/s/MskVelo": messageHtml(12, "c") + messageHtml(13, "d"),
      "https://t.me/s/MskVelo?before=12": messageHtml(10, "a") + messageHtml(11, "b"),
    };
    const fetchImpl = vi.fn(
      async (url: string | URL | Request) => new Response(pages[String(url)] ?? "")
    );

    const posts = await fetchChannelPosts("MskVelo", {
      limit: 3,
      fetchImpl: fetchImpl as typeof fetch,
    });

    expect(posts.map((post) => post.messageId)).toEqual([13, 12, 11]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("stops when a page brings no new posts", async () => {
    const fetchImpl = vi.fn(async () => new Response(messageHtml(5, "only")));

    const posts = await fetchChannelPosts("MskVelo", {
      limit: 10,
      fetchImpl: fetchImpl as typeof fetch,
    });

    expect(posts).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
