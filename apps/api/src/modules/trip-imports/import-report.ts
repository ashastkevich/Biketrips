import type { TelegramChannelPost } from "./telegram-channel-preview.js";
import { postKinds, type DraftCheck, type PostExtractionResult } from "./trip-post-extraction.js";

export interface ReportEntry {
  post: TelegramChannelPost;
  result: PostExtractionResult | null;
  error: string | null;
  draft: DraftCheck | null;
}

export function renderReport(
  channelName: string,
  model: string,
  reportEntries: ReportEntry[]
): string {
  const kindCounts = new Map<string, number>();
  for (const entry of reportEntries) {
    const kind = entry.result?.extraction?.kind ?? (entry.error ? "error" : "refusal");
    kindCounts.set(kind, (kindCounts.get(kind) ?? 0) + 1);
  }

  const trips = reportEntries.filter(
    (entry) => entry.result?.extraction?.kind === "single_trip" && entry.draft
  );
  const complete = trips.filter((entry) => entry.draft!.missingRequired.length === 0);
  const fieldGaps = new Map<string, number>();
  for (const entry of trips) {
    for (const field of entry.draft!.missingRequired)
      fieldGaps.set(field, (fieldGaps.get(field) ?? 0) + 1);
  }

  const inputTokens = sum(reportEntries.map((entry) => entry.result?.usage.inputTokens ?? 0));
  const outputTokens = sum(reportEntries.map((entry) => entry.result?.usage.outputTokens ?? 0));

  const lines: string[] = [
    `# Импорт из @${channelName}`,
    "",
    `Сформировано ${new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })} МСК, модель \`${model}\`.`,
    "",
    "## Сводка",
    "",
    `- Постов: ${reportEntries.length}`,
    ...[...postKinds, "error", "refusal"]
      .filter((kind) => kindCounts.has(kind))
      .map((kind) => `- ${kind}: ${kindCounts.get(kind)}`),
    `- Поездок с заполненными обязательными полями: ${complete.length} из ${trips.length}`,
    `- Чаще всего не хватает: ${
      [...fieldGaps.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([field, count]) => `${field} (${count})`)
        .join(", ") || "—"
    }`,
    `- Токены: ${inputTokens} входных, ${outputTokens} выходных`,
    "",
    "## Посты",
    "",
  ];

  for (const entry of reportEntries) lines.push(...renderEntry(entry), "");

  return lines.join("\n");
}

function renderEntry({ post, result, error, draft }: ReportEntry): string[] {
  const extraction = result?.extraction;
  const heading =
    extraction?.trip?.title ?? post.text.split("\n")[0]?.slice(0, 80) ?? "(без текста)";
  const lines = [
    `### [${post.messageId}](${post.url}) ${heading}`,
    "",
    `Опубликован ${formatMoscow(post.postedAt)}${post.edited ? ", отредактирован" : ""}${
      post.authorSignature ? `, ${post.authorSignature}` : ""
    }`,
    "",
  ];

  if (error || !extraction) {
    lines.push(`**Ошибка:** ${error ?? `ответ без данных (stop_reason: ${result?.stopReason})`}`);
  } else {
    lines.push(
      `**${extraction.kind}** (уверенность: ${extraction.confidence}). ${extraction.kindReason}`
    );
    if (extraction.notes) lines.push("", `Заметки модели: ${extraction.notes}`);
  }

  if (draft) {
    const { draft: trip, missingRequired, warnings } = draft;
    lines.push(
      "",
      "| Поле | Значение |",
      "|---|---|",
      row("Старт", trip.startAt ? formatMoscow(trip.startAt) : null),
      row("Окончание", trip.endDate),
      row("Место сбора", trip.startLocationName),
      row("Координаты", trip.startLat !== null ? `${trip.startLat}, ${trip.startLng}` : null),
      row("Дистанция, км", trip.distanceKm),
      row("Темп, км/ч", trip.paceMin !== null ? `${trip.paceMin}–${trip.paceMax}` : null),
      row(
        "Покрытие",
        trip.asphaltPercent !== null
          ? `асфальт ${trip.asphaltPercent}% / грунт ${trip.unpavedPercent}%`
          : null
      ),
      row("Типы грунта", trip.unpavedSurfaceDetails.join(", ") || null),
      row("Сложность", trip.difficulty),
      row("Клуб", trip.clubName),
      row("Ведущие", trip.leaderUsernames.map((username) => `@${username}`).join(", ") || null),
      row("Запись", trip.externalRegistrationUrl),
      row("Трек", trip.routeUrl),
      row("Платно", trip.isPaid ? (trip.priceText ?? "да") : null),
      row("Снаряжение", trip.equipmentRequirements),
      row("Правила", trip.rules)
    );
    if (missingRequired.length > 0) lines.push("", `**Не хватает:** ${missingRequired.join(", ")}`);
    if (warnings.length > 0) lines.push("", ...warnings.map((warning) => `- ⚠️ ${warning}`));
    lines.push(
      "",
      "<details><summary>Описание для сайта</summary>",
      "",
      trip.description,
      "",
      "</details>"
    );
  }

  lines.push(
    "",
    "<details><summary>Исходный пост</summary>",
    "",
    "```text",
    post.text,
    "```",
    "",
    "</details>"
  );
  return lines;
}

function row(label: string, value: string | number | null): string {
  const cell =
    value === null || value === "" ? "—" : String(value).replace(/\|/g, "\\|").replace(/\n/g, " ");
  return `| ${label} | ${cell} |`;
}

function formatMoscow(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
