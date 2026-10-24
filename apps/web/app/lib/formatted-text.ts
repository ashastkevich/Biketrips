// Trip descriptions are plain text with line breaks. Imported Telegram posts also
// carry named links as Markdown "[label](url)" and formatting as the literal tags
// <b>, <i>, <u> and <s>. Bare URLs are linked too. Only http(s) targets become
// links, and no other markup is recognized, so everything else stays text.

export type FormattingTag = "b" | "i" | "u" | "s";

export type FormattedTextNode =
  | { type: "text"; text: string }
  | { type: "link"; text: string; href: string }
  | { type: "format"; tag: FormattingTag; children: FormattedTextNode[] };

const tagPattern = /<(\/?)([bius])>/g;
const linkPattern =
  /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>()\]]*[^\s<>()\].,!?;:'"»])/g;

export function parseFormattedText(text: string): FormattedTextNode[] {
  const root: FormattedTextNode[] = [];
  const stack: Array<{ tag: FormattingTag; children: FormattedTextNode[] }> = [];
  const current = () => stack.at(-1)?.children ?? root;

  let lastIndex = 0;
  for (const match of text.matchAll(tagPattern)) {
    const index = match.index ?? 0;
    current().push(...parseLinks(text.slice(lastIndex, index)));
    lastIndex = index + match[0].length;

    const [, closing, tag] = match as unknown as [string, string, FormattingTag];
    if (!closing) {
      const node = { type: "format" as const, tag, children: [] };
      current().push(node);
      stack.push(node);
      continue;
    }
    // A closing tag closes the nearest open tag of its kind; a stray one is dropped.
    const openIndex = stack.map((entry) => entry.tag).lastIndexOf(tag);
    if (openIndex >= 0) stack.length = openIndex;
  }
  current().push(...parseLinks(text.slice(lastIndex)));
  return root;
}

function parseLinks(text: string): FormattedTextNode[] {
  const nodes: FormattedTextNode[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(linkPattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) nodes.push({ type: "text", text: text.slice(lastIndex, index) });
    const [whole, label, labelledHref, bareHref] = match;
    nodes.push(
      label && labelledHref
        ? { type: "link", text: label, href: labelledHref }
        : { type: "link", text: bareHref ?? whole, href: bareHref ?? whole }
    );
    lastIndex = index + whole.length;
  }
  if (lastIndex < text.length) nodes.push({ type: "text", text: text.slice(lastIndex) });
  return nodes;
}

/** The description without link and formatting markup, for meta tags and previews. */
export function formattedTextToPlain(text: string): string {
  return text.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1").replace(tagPattern, "");
}
