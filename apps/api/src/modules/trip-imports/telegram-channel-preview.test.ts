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
        `Чат: <a href="https://t.me/gravelmtb">https://t.me/gravelmtb</a>&nbsp;&#33; <a href="?q=%23список">#список</a>`,
      `<a class="tgme_widget_message_photo_wrap" style="width:453px;background-image:url('https://cdn4.telesco.pe/file/abc.jpg')"></a><span class="tgme_widget_message_from_author">Ольга_SV</span>
       <a class="tgme_widget_message_forwarded_from_name" href="https://t.me/club/5">Клуб</a>`
    );

    expect(parseChannelPreviewPage(html)).toEqual([
      {
        channel: "MskVelo",
        messageId: 19590,
        url: "https://t.me/MskVelo/19590",
        postedAt: "2026-10-11T17:31:37.000Z",
        edited: false,
        text: "🗓 Вт, 13.10 — 19:30\nСтарт: [Белорусская](https://yandex.ru/maps/?ll=37.5&z=15)\nЧат: https://t.me/gravelmtb ! #список",
        hasMedia: true,
        coverUrl: "https://cdn4.telesco.pe/file/abc.jpg",
        authorSignature: "Ольга_SV",
        forwardedFrom: { name: "Клуб", url: "https://t.me/club/5" },
      },
    ]);
  });

  it("keeps bold, italic and links but not emoji wrappers", () => {
    const html = messageHtml(
      19700,
      `<i class="emoji" style="background-image:url('//telegram.org/img/emoji/40/E29AA0.png')"><b>⚠️</b></i> ` +
        `<b>День 2:&nbsp;</b>спуск<br/><i>Приходи</i> к <b><a href="https://t.me/x">нам</a></b><b> </b>`
    );

    expect(parseChannelPreviewPage(html)[0]?.text).toBe(
      "⚠️ <b>День 2: </b>спуск\n<i>Приходи</i> к <b>[нам](https://t.me/x)</b>"
    );
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
