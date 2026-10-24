// Trip descriptions are plain text with line breaks. Imported posts also carry
// Telegram's named links as Markdown "[label](url)"; bare URLs are linked too.
// Only http(s) targets become links, everything else stays text.

export type FormattedTextPart =
  { type: "text"; text: string } | { type: "link"; text: string; href: string };

const linkPattern =
  /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>()\]]*[^\s<>()\].,!?;:'"»])/g;

export function parseFormattedText(text: string): FormattedTextPart[] {
  const parts: FormattedTextPart[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(linkPattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) parts.push({ type: "text", text: text.slice(lastIndex, index) });
    const [whole, label, labelledHref, bareHref] = match;
    parts.push(
      label && labelledHref
        ? { type: "link", text: label, href: labelledHref }
        : { type: "link", text: bareHref ?? whole, href: bareHref ?? whole }
    );
    lastIndex = index + whole.length;
  }
  if (lastIndex < text.length) parts.push({ type: "text", text: text.slice(lastIndex) });
  return parts;
}

/** The description without link markup, for meta tags and short previews. */
export function formattedTextToPlain(text: string): string {
  return text.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1");
}
