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

  it("leaves non-web targets as text", () => {
    expect(parseFormattedText("[тут](javascript:alert(1))")).toEqual([
      { type: "text", text: "[тут](javascript:alert(1))" },
    ]);
  });
});

describe("formattedTextToPlain", () => {
  it("keeps link labels only", () => {
    expect(formattedTextToPlain("Трек [тут](https://nakarte.me/#m=10)")).toBe("Трек тут");
  });
});
