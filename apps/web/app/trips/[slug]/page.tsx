import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppTopbar, DataNotice, PageHeader, ParticipantList, TripFacts } from "../../lib/components";
import { getTrip, joinTrip } from "../../lib/api";
import { readParticipantInput } from "../../lib/form-data";
import { formatDateTime } from "../../lib/labels";

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
      <Link className="back-link" href="/">
        На главную
      </Link>

      <PageHeader eyebrow={`${trip.city} · ${formatDateTime(trip.startDateTime)}`} title={trip.title}>
        <p>{trip.description}</p>
      </PageHeader>

      <DataNotice source={result.source} error={result.error} />
      {hasFlag(query.joined) ? (
        <div className="notice success" role="status">
          Заявка отправлена. Организатор увидит ваши данные в списке участников.
        </div>
      ) : null}
      {query.joinError ? (
        <div className="notice danger" role="alert">
          {Array.isArray(query.joinError) ? query.joinError[0] : query.joinError}
        </div>
      ) : null}

      <section className="content-grid">
        <div className="stack">
          <section className="panel" aria-labelledby="facts-title">
            <h2 id="facts-title">Параметры</h2>
            <TripFacts trip={trip} />
          </section>

          <section className="panel" aria-labelledby="route-title">
            <h2 id="route-title">Маршрут и условия</h2>
            <div className="rich-text">
              <p>{trip.routeDescription ?? "Организатор добавит описание маршрута позже."}</p>
              <h3>Снаряжение</h3>
              <p>{trip.equipmentRequirements ?? "Особых требований нет."}</p>
              <h3>Правила</h3>
              <p>{trip.rules ?? "Следуйте указаниям организатора и берегите группу."}</p>
            </div>
          </section>

          <section className="panel" aria-labelledby="participants-title">
            <h2 id="participants-title">Участники</h2>
            <ParticipantList trip={trip} />
          </section>
        </div>

        <aside className="side-panel" aria-labelledby="join-title">
          <h2 id="join-title">Записаться</h2>
          <p className="muted">
            Мест занято: {trip.confirmedParticipants}/{trip.capacity}. Если лимит заполнен,
            заявка попадет в лист ожидания.
          </p>
          <form action={joinAction} className="form">
            <input name="userId" type="hidden" value={`web-${trip.id}`} />
            <label>
              <span>Имя</span>
              <input name="name" required minLength={2} placeholder="Алексей" />
            </label>
            <label>
              <span>Telegram</span>
              <input name="telegramUsername" placeholder="username" />
            </label>
            <label>
              <span>Телефон</span>
              <input name="phone" inputMode="tel" placeholder="+7..." />
            </label>
            <label>
              <span>Комментарий</span>
              <textarea name="comment" rows={4} placeholder="Опыт, вопросы, пожелания" />
            </label>
            <button className="button" type="submit">
              Отправить заявку
            </button>
          </form>
        </aside>
      </section>
    </main>
  );
}
