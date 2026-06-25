import { hasAvailablePlaces, type TripSummary } from "@biketrips/domain";

const demoTrips: TripSummary[] = [
  {
    id: "demo-trip-1",
    slug: "moscow-evening-gravel",
    title: "Вечерний gravel по паркам",
    city: "Москва",
    startDateTime: "2026-07-04T18:30:00+03:00",
    distanceKm: 42,
    difficulty: "medium",
    pace: "steady",
    bikeTypes: ["gravel", "hybrid", "mtb"],
    surfaceTypes: ["gravel", "park_paths", "mixed"],
    format: "no_drop",
    status: "published",
    capacity: 14,
    confirmedParticipants: 8,
  },
];

export default function HomePage() {
  return (
    <main className="shell">
      <section className="intro" aria-labelledby="page-title">
        <p className="eyebrow">BikeTrips MVP</p>
        <h1 id="page-title">Каркас сервиса совместных велопоездок</h1>
        <p>
          Монорепозиторий готов к следующему этапу: web, API, bot и общие packages уже разделены, а
          доменные типы используются между приложениями.
        </p>
      </section>

      <section className="trip-list" aria-label="Ближайшие поездки">
        {demoTrips.map((trip) => (
          <article className="trip-card" key={trip.id}>
            <div>
              <p className="trip-meta">
                {trip.city} · {new Date(trip.startDateTime).toLocaleString("ru-RU")}
              </p>
              <h2>{trip.title}</h2>
            </div>
            <dl>
              <div>
                <dt>Дистанция</dt>
                <dd>{trip.distanceKm} км</dd>
              </div>
              <div>
                <dt>Места</dt>
                <dd>
                  {trip.confirmedParticipants}/{trip.capacity}
                </dd>
              </div>
              <div>
                <dt>Статус</dt>
                <dd>{hasAvailablePlaces(trip) ? "Есть места" : "Лист ожидания"}</dd>
              </div>
            </dl>
          </article>
        ))}
      </section>
    </main>
  );
}
