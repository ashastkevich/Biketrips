import { notFound, redirect } from "next/navigation";

import { AppTopbar, DataNotice, PageHeader, ParticipantList, TripFacts } from "../../lib/components";
import { getTrip, joinTrip } from "../../lib/api";
import { readParticipantInput } from "../../lib/form-data";
import { formatDateTime } from "../../lib/labels";
import {
  Alert,
  BackLink,
  Button,
  Card,
  FormField,
  TextareaField,
  TextField,
} from "../../ui/components";

interface TripPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function hasFlag(value: string | string[] | undefined): boolean {
  return value === "1" || (Array.isArray(value) && value.includes("1"));
}

export default async function TripPage({ params, searchParams }: TripPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const result = await getTrip(slug);

  if (!result.data) {
    notFound();
  }

  const trip = result.data;

  async function joinAction(formData: FormData) {
    "use server";

    let destination = `/trips/${slug}?joined=1`;

    try {
      await joinTrip(trip.id, readParticipantInput(formData));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось записаться";
      destination = `/trips/${slug}?joinError=${encodeURIComponent(message)}`;
    }

    redirect(destination);
  }

  return (
    <main className="shell detail-shell">
      <AppTopbar />
      <BackLink href="/">
        На главную
      </BackLink>

      <PageHeader eyebrow={`${trip.city} · ${formatDateTime(trip.startDateTime)}`} title={trip.title}>
        <p>{trip.description}</p>
      </PageHeader>

      <DataNotice source={result.source} error={result.error} />
      {hasFlag(query.joined) ? (
        <Alert title="Заявка отправлена" tone="success">
          Организатор увидит ваши данные в списке участников.
        </Alert>
      ) : null}
      {query.joinError ? (
        <Alert title="Не удалось записаться" tone="danger">
          {Array.isArray(query.joinError) ? query.joinError[0] : query.joinError}
        </Alert>
      ) : null}
      <section className="content-grid">
        <div className="stack">
          <Card className="content-card" padding="large">
            <h2 id="facts-title">Параметры</h2>
            <TripFacts trip={trip} />
          </Card>

          <Card className="content-card" padding="large">
            <h2 id="route-title">Маршрут и условия</h2>
            <div className="rich-text">
              <p>{trip.routeDescription ?? "Организатор добавит описание маршрута позже."}</p>
              <h3>Снаряжение</h3>
              <p>{trip.equipmentRequirements ?? "Особых требований нет."}</p>
              <h3>Правила</h3>
              <p>{trip.rules ?? "Следуйте указаниям организатора и берегите группу."}</p>
            </div>
          </Card>

          <Card className="content-card" padding="large">
            <h2 id="participants-title">Участники</h2>
            <ParticipantList trip={trip} />
          </Card>
        </div>

        <aside aria-labelledby="join-title">
          <Card className="side-panel" padding="large">
          <h2 id="join-title">Записаться</h2>
          <p className="muted">
            Мест занято: {trip.confirmedParticipants}/{trip.capacity}. Если лимит заполнен,
            заявка попадет в лист ожидания.
          </p>
          <form action={joinAction} className="form">
            <input name="userId" type="hidden" value={`web-${trip.id}`} />
            <FormField label="Имя" required>
              <TextField name="name" required minLength={2} placeholder="Алексей" />
            </FormField>
            <FormField label="Telegram">
              <TextField name="telegramUsername" placeholder="username" />
            </FormField>
            <FormField label="Телефон">
              <TextField name="phone" inputMode="tel" placeholder="+7..." />
            </FormField>
            <FormField label="Комментарий">
              <TextareaField name="comment" rows={4} placeholder="Опыт, вопросы, пожелания" />
            </FormField>
            <Button type="submit">Отправить заявку</Button>
          </form>
          </Card>
        </aside>
      </section>
    </main>
  );
}
