import type { ReactNode } from "react";

import { parseFormattedText, type FormattedTextNode } from "../lib/formatted-text";
import styles from "./formatted-text.module.css";

/** Plain text with its line breaks kept, links made clickable and basic formatting. */
export function FormattedText({ text, className }: { text: string; className?: string }) {
  return (
    <p className={className ? `${styles.text} ${className}` : styles.text}>
      {renderNodes(parseFormattedText(text))}
    </p>
  );
}

function renderNodes(nodes: FormattedTextNode[]): ReactNode[] {
  return nodes.map((node, index) => {
    if (node.type === "text") return node.text;
    if (node.type === "link") {
      return (
        <a href={node.href} key={index} target="_blank" rel="noopener noreferrer nofollow">
          {node.text}
        </a>
      );
    }
    const Tag = node.tag;
    return <Tag key={index}>{renderNodes(node.children)}</Tag>;
  });
}
