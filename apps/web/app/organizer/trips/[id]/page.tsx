import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { participantStatuses } from "@biketrips/domain";

import { AppTopbar, DataNotice, PageHeader, TripFacts } from "../../../lib/components";
import { getOrganizerAuthState, getTrip, updateParticipantStatus, updateTripStatus } from "../../../lib/api";
import { readParticipantStatus } from "../../../lib/form-data";
import { participantStatusLabels, tripStatusLabels } from "../../../lib/labels";

interface OrganizerTripPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function OrganizerTripPage({ params, searchParams }: OrganizerTripPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const result = await getTrip(id);

  if (!result.data) {
    notFound();
  }

  const trip = result.data;

  async function statusAction(formData: FormData) {
    "use server";

    const action = String(formData.get("action"));
    let destination = `/organizer/trips/${id}?updated=1`;

    try {
      if (action === "publish" || action === "cancel" || action === "finish") {
        await updateTripStatus(trip.id, action);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось обновить поездку";
      destination = `/organizer/trips/${id}?error=${encodeURIComponent(message)}`;
    }

    redirect(destination);
  }

  async function participantAction(formData: FormData) {
    "use server";

    const participantId = String(formData.get("participantId"));
    let destination = `/organizer/trips/${id}?updated=1`;

    try {
      await updateParticipantStatus(trip.id, participantId, readParticipantStatus(formData));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось обновить участника";
      destination = `/organizer/trips/${id}?error=${encodeURIComponent(message)}`;
    }

    redirect(destination);
  }

  const error = Array.isArray(query.error) ? query.error[0] : query.error;

  return (
    <main className="shell detail-shell">
      <AppTopbar />
      <Link className="back-link" href="/organizer/trips">
        Все поездки
      </Link>
      <PageHeader
        eyebrow={`Статус: ${tripStatusLabels[trip.status]}`}
        title={trip.title}
        actions={
          <Link className="button secondary" href={`/trips/${trip.slug}`}>
            Публичная карточка
          </Link>
        }
      >
        <p>{trip.description}</p>
      </PageHeader>

      <DataNotice source={result.source} error={result.error} />
      {getOrganizerAuthState() === "missing" ? (
        <div className="notice" role="status">
          Для действий организатора нужен серверный `BIKETRIPS_ORGANIZER_TOKEN`.
        </div>
      ) : null}
      {query.created ? (
        <div className="notice success" role="status">
          Черновик создан.
        </div>
      ) : null}
      {query.updated ? (
        <div className="notice success" role="status">
          Изменения сохранены.
        </div>
      ) : null}
      {error ? (
        <div className="notice danger" role="alert">
          {error}
        </div>
      ) : null}

      <section className="content-grid">
        <div className="stack">
          <section className="panel" aria-labelledby="settings-title">
            <h2 id="settings-title">Публикация</h2>
            <TripFacts trip={trip} />
            <form action={statusAction} className="button-row">
              <button className="button" name="action" value="publish" type="submit">
                Опубликовать
              </button>
              <button className="button secondary" name="action" value="finish" type="submit">
                Завершить
              </button>
              <button className="button danger-button" name="action" value="cancel" type="submit">
                Отменить
              </button>
            </form>
          </section>

          <section className="panel" aria-labelledby="updates-title">
            <h2 id="updates-title">Обновления</h2>
            {trip.updates.length > 0 ? (
              <div className="update-list">
                {trip.updates.map((update) => (
                  <article key={update.id}>
                    <h3>{update.title}</h3>
                    <p>{update.body}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted">Обновлений пока нет.</p>
            )}
          </section>
        </div>

        <aside className="side-panel" aria-labelledby="requests-title">
          <h2 id="requests-title">Заявки</h2>
          {trip.participants.length > 0 ? (
            <div className="participant-stack">
              {trip.participants.map((participant) => (
                <form action={participantAction} className="participant-card" key={participant.id}>
                  <input name="participantId" type="hidden" value={participant.id} />
                  <div>
                    <strong>{participant.name}</strong>
                    <p>{participant.telegramUsername ? `@${participant.telegramUsername}` : "Telegram не указан"}</p>
                  </div>
                  <label>
                    <span>Статус</span>
                    <select name="status" defaultValue={participant.status}>
                      {participantStatuses.map((status) => (
                        <option key={status} value={status}>
                          {participantStatusLabels[status]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="button secondary" type="submit">
                    Сохранить
                  </button>
                </form>
              ))}
            </div>
          ) : (
            <p className="muted">Новых заявок нет.</p>
          )}
        </aside>
      </section>
    </main>
  );
}
