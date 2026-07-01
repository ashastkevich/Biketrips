import { notFound, redirect } from "next/navigation";
import { participantStatuses } from "@biketrips/domain";

import { AppTopbar, DataNotice, PageHeader, TripFacts } from "../../../lib/components";
import { getOrganizerAuthState, getTrip, updateParticipantStatus, updateTripStatus } from "../../../lib/api";
import { readParticipantStatus } from "../../../lib/form-data";
import { participantStatusLabels, tripStatusLabels } from "../../../lib/labels";
import {
  Alert,
  BackLink,
  Button,
  Card,
  FormField,
  LinkButton,
  ParticipantRow,
  SelectField,
  TripStatusBadge,
} from "../../../ui/components";

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
      <BackLink href="/organizer/trips">
        Все поездки
      </BackLink>
      <PageHeader
        eyebrow={`Статус: ${tripStatusLabels[trip.status]}`}
        title={trip.title}
        actions={
          <LinkButton tone="secondary" href={`/trips/${trip.slug}`}>
            Публичная карточка
          </LinkButton>
        }
      >
        <p>{trip.description}</p>
      </PageHeader>

      <DataNotice source={result.source} error={result.error} />
      {getOrganizerAuthState() === "missing" ? (
        <Alert title="Действия организатора недоступны" tone="warning">
          Для действий организатора нужен серверный `BIKETRIPS_ORGANIZER_TOKEN`.
        </Alert>
      ) : null}
      {query.created ? (
        <Alert tone="success">Черновик создан.</Alert>
      ) : null}
      {query.updated ? (
        <Alert tone="success">Изменения сохранены.</Alert>
      ) : null}
      {error ? (
        <Alert title="Не удалось сохранить" tone="danger">{error}</Alert>
      ) : null}
      <section className="content-grid">
        <div className="stack">
          <Card className="content-card" padding="large">
            <div className="section-title-row">
            <h2 id="settings-title">Публикация</h2>
              <TripStatusBadge status={trip.status} />
            </div>
            <TripFacts trip={trip} />
            <form action={statusAction} className="button-row">
              <Button name="action" value="publish" type="submit">
                Опубликовать
              </Button>
              <Button tone="secondary" name="action" value="finish" type="submit">
                Завершить
              </Button>
              <Button tone="danger" name="action" value="cancel" type="submit">
                Отменить
              </Button>
            </form>
          </Card>

          <Card className="content-card" padding="large">
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
          </Card>
        </div>

        <aside aria-labelledby="requests-title">
          <Card className="side-panel" padding="large">
          <h2 id="requests-title">Заявки</h2>
          {trip.participants.length > 0 ? (
            <div className="participant-stack">
              {trip.participants.map((participant) => (
                <form action={participantAction} className="participant-request" key={participant.id}>
                  <input name="participantId" type="hidden" value={participant.id} />
                  <ParticipantRow participant={participant} />
                  <FormField label="Статус">
                    <SelectField name="status" defaultValue={participant.status}>
                      {participantStatuses.map((status) => (
                        <option key={status} value={status}>
                          {participantStatusLabels[status]}
                        </option>
                      ))}
                    </SelectField>
                  </FormField>
                  <Button tone="secondary" size="small" type="submit">Сохранить</Button>
                </form>
              ))}
            </div>
          ) : (
            <p className="muted">Новых заявок нет.</p>
          )}
          </Card>
        </aside>
      </section>
    </main>
  );
}
