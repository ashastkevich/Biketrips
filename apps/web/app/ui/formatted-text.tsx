import { parseFormattedText } from "../lib/formatted-text";
import styles from "./formatted-text.module.css";

/** Plain text with its line breaks kept and links made clickable. */
export function FormattedText({ text, className }: { text: string; className?: string }) {
  return (
    <p className={className ? `${styles.text} ${className}` : styles.text}>
      {parseFormattedText(text).map((part, index) =>
        part.type === "link" ? (
          <a href={part.href} key={index} target="_blank" rel="noopener noreferrer nofollow">
            {part.text}
          </a>
        ) : (
          part.text
        )
      )}
    </p>
  );
}
