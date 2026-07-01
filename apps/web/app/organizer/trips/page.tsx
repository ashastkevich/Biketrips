import Link from "next/link";

import { AppTopbar, DataNotice, PageHeader, PlusIcon } from "../../lib/components";
import { getTrips } from "../../lib/api";
import { formatShortDate } from "../../lib/labels";
import { Card, EmptyState, LinkButton, TripStatusBadge } from "../../ui/components";

export default async function OrganizerTripsPage() {
  const result = await getTrips({ includeDrafts: true });

  return (
    <main className="shell">
      <AppTopbar />
      <PageHeader
        eyebrow="Кабинет организатора"
        title="Мои поездки"
        actions={
          <LinkButton href="/trips/new">
            <PlusIcon />
            Создать поездку
          </LinkButton>
        }
      >
        <p>Управляйте публикацией, лимитом мест и заявками участников.</p>
      </PageHeader>

      <DataNotice source={result.source} error={result.error} />

      {result.data.length > 0 ? (
        <Card className="table-wrap" padding="none">
          <table>
            <thead>
              <tr>
                <th>Поездка</th>
                <th>Дата</th>
                <th>Город</th>
                <th>Места</th>
                <th>Статус</th>
                <th aria-label="Действия" />
              </tr>
            </thead>
            <tbody>
              {result.data.map((trip) => (
                <tr key={trip.id}>
                  <td>{trip.title}</td>
                  <td>{formatShortDate(trip.startDateTime)}</td>
                  <td>{trip.city}</td>
                  <td>
                    {trip.confirmedParticipants}/{trip.capacity}
                  </td>
                  <td><TripStatusBadge status={trip.status} /></td>
                  <td>
                    <Link className="table-link" href={`/organizer/trips/${trip.id}`}>
                      Открыть
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <EmptyState
          title="Поездок пока нет"
          action={<LinkButton href="/trips/new">Создать поездку</LinkButton>}
        >
          Создайте первую поездку, чтобы получить публичную ссылку.
        </EmptyState>
      )}
    </main>
  );
}
