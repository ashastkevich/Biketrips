import { serializeJsonLd } from "../lib/structured-data";

export function JsonLd({ data }: { data: Record<string, unknown>[] }) {
  // Escaped by serializeJsonLd, so the trip text inside cannot break out of the script.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
