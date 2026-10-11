/**
 * The user-facing message from an API error body. Nest validation errors carry a list of
 * messages, other errors a single string; anything else falls back to the given text.
 */
export function getApiErrorMessage(result: unknown, fallback: string): string {
  if (!result || typeof result !== "object" || !("message" in result)) return fallback;

  const message = result.message;
  if (typeof message === "string" && message) return message;
  if (Array.isArray(message)) {
    const first = message.find((item): item is string => typeof item === "string" && item !== "");
    if (first) return first;
  }
  return fallback;
}
