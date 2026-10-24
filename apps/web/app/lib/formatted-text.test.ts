import { describe, expect, it } from "vitest";

import { formattedTextToPlain, parseFormattedText } from "./formatted-text";

describe("parseFormattedText", () => {
  it("turns named Markdown links and bare URLs into links and keeps the rest", () => {
    expect(
      parseFormattedText(
        "Ведущий: [Димончик](https://t.me/Demon1982)\nЧат: https://t.me/gravelmtb."
      )
    ).toEqual([
      { type: "text", text: "Ведущий: " },
      { type: "link", text: "Димончик", href: "https://t.me/Demon1982" },
      { type: "text", text: "\nЧат: " },
      { type: "link", text: "https://t.me/gravelmtb", href: "https://t.me/gravelmtb" },
      { type: "text", text: "." },
    ]);
  });

  it("nests formatting and links inside it", () => {
    expect(parseFormattedText("<b>День 1: <i>к [нам](https://t.me/x)</i></b> едем")).toEqual([
      {
        type: "format",
        tag: "b",
        children: [
          { type: "text", text: "День 1: " },
          {
            type: "format",
            tag: "i",
            children: [
              { type: "text", text: "к " },
              { type: "link", text: "нам", href: "https://t.me/x" },
            ],
          },
        ],
      },
      { type: "text", text: " едем" },
    ]);
  });

  it("closes unbalanced tags and leaves other markup and non-web targets as text", () => {
    expect(
      parseFormattedText("<b>жирный</i> <script>x</script> [тут](javascript:alert(1))")
    ).toEqual([
      {
        type: "format",
        tag: "b",
        children: [
          { type: "text", text: "жирный" },
          { type: "text", text: " <script>x</script> [тут](javascript:alert(1))" },
        ],
      },
    ]);
  });
});

describe("formattedTextToPlain", () => {
  it("keeps link labels and drops formatting tags", () => {
    expect(formattedTextToPlain("<b>Трек</b> [тут](https://nakarte.me/#m=10)")).toBe("Трек тут");
  });
});
