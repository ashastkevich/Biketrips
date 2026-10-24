import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ImportedPostStatus } from "@biketrips/domain";

import { AppTopbar } from "../../lib/app-topbar";
import { getCurrentUser, getImportSources, runImport } from "../../lib/api";
import { formatDateTime } from "../../lib/labels";
import { noIndexMetadata } from "../../lib/site";
import { Alert, Badge, Button, LinkButton, type BadgeTone } from "../../ui/components";
import styles from "./imports.module.css";

export const metadata: Metadata = {
  title: "Импорт из Telegram",
  ...noIndexMetadata,
};

const statusLabels: Record<ImportedPostStatus, { label: string; tone: BadgeTone }> = {
  imported: { label: "Поездка", tone: "success" },
  skipped: { label: "Пропущен", tone: "neutral" },
  error: { label: "Ошибка", tone: "danger" },
};

async function runImportAction(formData: FormData) {
  "use server";
  const sourceId = formData.get("sourceId");
  if (typeof sourceId !== "string") redirect("/admin/imports");

  let destination: string;
  try {
    const result = await runImport(sourceId);
    destination = `/admin/imports?${new URLSearchParams({
      created: String(result.created),
      updated: String(result.updated),
      cancelled: String(result.cancelled),
      errors: String(result.errors),
    })}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось запустить импорт";
    destination = `/admin/imports?error=${encodeURIComponent(message)}`;
  }
  redirect(destination);
}

interface ImportsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ImportsPage({ searchParams }: ImportsPageProps) {
  const [user, result, query] = await Promise.all([
    getCurrentUser(),
    getImportSources(),
    searchParams,
  ]);
  if (!user || user.role !== "admin") notFound();

  const read = (name: string) => {
    const value = query[name];
    return Array.isArray(value) ? value[0] : value;
  };
  const error = read("error");
  const created = read("created");

  return (
    <>
      <AppTopbar showCreateAction={false} />
      <main className={`shell app-content-shell ${styles.page}`}>
        <header className={styles.header}>
          <div>
            <p>Администрирование</p>
            <h1>Импорт из Telegram</h1>
          </div>
          <LinkButton href="/admin/moderation" tone="secondary" size="small">
            Очередь модерации
          </LinkButton>
        </header>

        {created !== undefined ? (
          <Alert title="Импорт завершён" tone="success">
            Новых поездок: {created}, обновлено: {read("updated")}, отменено: {read("cancelled")},
            ошибок: {read("errors")}. Новые поездки ждут проверки в очереди модерации.
          </Alert>
        ) : null}
        {error ? <Alert title="Импорт не удался" tone="danger">{error}</Alert> : null}
        {result.source === "unavailable" ? (
          <Alert title="Журнал импорта недоступен" tone="danger">{result.error}</Alert>
        ) : null}

        {result.data.map((source) => (
          <section className={styles.source} key={source.id} aria-labelledby={`source-${source.id}`}>
            <div className={styles.sourceHeader}>
              <div>
                <h2 id={`source-${source.id}`}>
                  <a href={`https://t.me/${source.handle}`} target="_blank" rel="noopener noreferrer">
                    @{source.handle}
                  </a>
                </h2>
                <p>
                  {source.city} ·{" "}
                  {source.lastRunAt
                    ? `последний запуск ${formatDateTime(source.lastRunAt)}`
                    : "ещё не запускался"}
                  {source.enabled ? "" : " · выключен"}
                </p>
              </div>
              <form action={runImportAction}>
                <input name="sourceId" type="hidden" value={source.id} />
                <Button type="submit" size="small">Запустить сейчас</Button>
              </form>
            </div>
            {source.lastError ? (
              <Alert title="Последний запуск завершился ошибкой" tone="danger">
                {source.lastError}
              </Alert>
            ) : null}

            {source.recentPosts.length === 0 ? (
              <p className={styles.empty}>Посты ещё не обработаны.</p>
            ) : (
              <ul className={styles.posts}>
                {source.recentPosts.map((post) => (
                  <li key={post.id}>
                    <div className={styles.postMeta}>
                      <Badge tone={statusLabels[post.status].tone}>
                        {statusLabels[post.status].label}
                      </Badge>
                      <span>{formatDateTime(post.postedAt)}</span>
                    </div>
                    <div className={styles.postBody}>
                      <a href={post.url} target="_blank" rel="noopener noreferrer">
                        {post.excerpt || `Пост ${post.messageId}`}
                      </a>
                      {post.tripSlug ? (
                        <Link href={`/trips/${post.tripSlug}`}>→ {post.tripTitle}</Link>
                      ) : null}
                      {post.skipReason ? <span>{post.skipReason}</span> : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </main>
    </>
  );
}
