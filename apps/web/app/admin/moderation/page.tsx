import type { Metadata } from "next";
import { noIndexMetadata } from "../../lib/site";
import { notFound, redirect } from "next/navigation";

import { AppTopbar } from "../../lib/app-topbar";
import { getCurrentUser, getTripsForModeration, moderateTrip } from "../../lib/api";
import {
  formatDateTime,
  formatDifficulty,
  formatDistance,
  formatSurfaceComposition,
} from "../../lib/labels";
import { getTripEditHref } from "../../lib/trip-links";
import { Alert, Button, LinkButton } from "../../ui/components";
import { FormattedText } from "../../ui/formatted-text";
import styles from "./moderation.module.css";

export const metadata: Metadata = {
  title: "Модерация поездок",
  ...noIndexMetadata,
};

async function moderationAction(formData: FormData) {
  "use server";
  const tripId = formData.get("tripId");
  const decision = formData.get("decision");
  const comment = formData.get("comment");
  if (
    typeof tripId !== "string" ||
    (decision !== "approve" && decision !== "request_changes" && decision !== "reject")
  ) {
    redirect("/admin/moderation?error=Некорректное действие");
  }

  try {
    await moderateTrip(tripId, decision, typeof comment === "string" ? comment : "");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось сохранить решение";
    redirect(`/admin/moderation?error=${encodeURIComponent(message)}`);
  }
  redirect("/admin/moderation?saved=1");
}

interface ModerationPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ModerationPage({ searchParams }: ModerationPageProps) {
  const [user, result, query] = await Promise.all([
    getCurrentUser(),
    getTripsForModeration(),
    searchParams,
  ]);
  if (!user || user.role !== "admin") notFound();

  const error = Array.isArray(query.error) ? query.error[0] : query.error;

  return (
    <>
      <AppTopbar showCreateAction={false} />
      <main className={`shell app-content-shell ${styles.page}`}>
        <header className={styles.header}>
          <div>
            <p>Администрирование</p>
            <h1>Модерация поездок</h1>
          </div>
          <div className={styles.headerActions}>
            <LinkButton href="/admin/imports" tone="secondary" size="small">
              Импорт из Telegram
            </LinkButton>
            <strong>{result.data.length} на проверке</strong>
          </div>
        </header>

        {query.saved === "1" ? (
          <Alert title="Решение сохранено" tone="success">
            Организатор получит уведомление.
          </Alert>
        ) : null}
        {error ? (
          <Alert title="Не удалось обработать поездку" tone="danger">
            {error}
          </Alert>
        ) : null}
        {result.source === "unavailable" ? (
          <Alert title="Очередь недоступна" tone="danger">
            {result.error}
          </Alert>
        ) : null}

        <div className={styles.queue}>
          {result.data.length === 0 ? (
            <section className={styles.empty}>Новых поездок на модерации пока нет.</section>
          ) : (
            result.data.map((trip) => {
              // Imported trips have no organizer to send them back to: the admin fixes them up.
              const isImported = trip.source !== "native";
              return (
                <article className={styles.card} key={trip.id}>
                  <div className={styles.cardHeader}>
                    <div>
                      <p>
                        {trip.city} · {formatDateTime(trip.startDateTime)}
                      </p>
                      <h2>{trip.title}</h2>
                      <span>Организатор: {trip.organizer.displayName}</span>
                    </div>
                    <span>
                      {isImported ? "Импорт · " : ""}
                      {trip.hasPendingRevision ? "Редакция" : "Новая поездка"}
                    </span>
                  </div>

                  {isImported && trip.moderationComment ? (
                    <Alert title="Проверьте по исходному посту" tone="warning">
                      <span className={styles.importNote}>{trip.moderationComment}</span>
                      {trip.sourceUrl ? (
                        <>
                          {" "}
                          <a href={trip.sourceUrl} target="_blank" rel="noopener noreferrer">
                            Открыть пост
                          </a>
                        </>
                      ) : null}
                    </Alert>
                  ) : null}

                  <dl className={styles.facts}>
                    <div>
                      <dt>Место старта</dt>
                      <dd>{trip.startLocationName}</dd>
                    </div>
                    <div>
                      <dt>Дистанция</dt>
                      <dd>{formatDistance(trip.distanceKm)}</dd>
                    </div>
                    <div>
                      <dt>Сложность</dt>
                      <dd>{formatDifficulty(trip.difficulty)}</dd>
                    </div>
                    <div>
                      <dt>Покрытие</dt>
                      <dd>{formatSurfaceComposition(trip.asphaltPercent, trip.unpavedPercent)}</dd>
                    </div>
                    {isImported ? (
                      <div>
                        <dt>Запись</dt>
                        <dd>{trip.externalRegistrationUrl ?? trip.sourceUrl ?? "Не указана"}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt>Описание</dt>
                      <dd>
                        <FormattedText text={trip.description} />
                      </dd>
                    </div>
                    <div>
                      <dt>Маршрут</dt>
                      <dd>{trip.routeDescription || "Не указан"}</dd>
                    </div>
                    <div>
                      <dt>Снаряжение</dt>
                      <dd>{trip.equipmentRequirements || "Не указано"}</dd>
                    </div>
                    <div>
                      <dt>Правила</dt>
                      <dd>{trip.rules || "Не указаны"}</dd>
                    </div>
                  </dl>

                  {trip.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className={styles.cover}
                      src={
                        trip.coverImage.startsWith("/trips/")
                          ? `/api${trip.coverImage}`
                          : trip.coverImage
                      }
                      alt="Обложка поездки"
                    />
                  ) : null}

                  <div className={styles.actions}>
                    <form action={moderationAction}>
                      <input name="tripId" type="hidden" value={trip.id} />
                      <input name="decision" type="hidden" value="approve" />
                      <Button type="submit">Опубликовать</Button>
                    </form>
                    {isImported ? (
                      <LinkButton
                        href={getTripEditHref(trip, { returnTo: "/", scope: "feed" })}
                        tone="secondary"
                      >
                        Редактировать
                      </LinkButton>
                    ) : null}
                    <form action={moderationAction} className={styles.commentAction}>
                      <input name="tripId" type="hidden" value={trip.id} />
                      <textarea
                        name="comment"
                        required
                        placeholder={
                          isImported
                            ? "Почему поездка не подходит"
                            : "Обязательный комментарий организатору"
                        }
                      />
                      <div>
                        {isImported ? null : (
                          <Button
                            name="decision"
                            value="request_changes"
                            tone="secondary"
                            type="submit"
                          >
                            Вернуть на исправление
                          </Button>
                        )}
                        <Button name="decision" value="reject" tone="danger" type="submit">
                          Отклонить окончательно
                        </Button>
                      </div>
                    </form>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </main>
    </>
  );
}
