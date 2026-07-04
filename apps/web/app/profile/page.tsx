import Link from "next/link";

import { AppTopbar, ClockIcon, PinIcon } from "../lib/components";
import { demoTrips } from "../lib/demo-data";
import { difficultyLabels, formatShortDate } from "../lib/labels";
import { Badge, LinkButton } from "../ui/components";
import { ProfileEditor } from "./profile-editor";

const upcomingTrips = demoTrips.filter((trip) => trip.status === "published").slice(0, 2);

export default function ProfilePage() {
  return (
    <main className="shell profile-page">
      <AppTopbar />

      <header className="profile-hero">
        <div className="profile-avatar" aria-hidden="true">
          АМ
        </div>
        <div className="profile-identity">
          <div className="profile-name-row">
            <h1>Алексей Морозов</h1>
            <Badge tone="success" dot>
              Профиль подтверждён
            </Badge>
          </div>
          <p>@aleksei_ride · Москва</p>
          <div className="profile-stat-row" aria-label="Статистика профиля">
            <span><strong>12</strong> поездок</span>
            <span><strong>286</strong> км вместе</span>
            <span><strong>2</strong> организовано</span>
          </div>
        </div>
      </header>

      <div className="profile-layout">
        <div className="profile-main">
          <ProfileEditor />

          <section className="profile-card" aria-labelledby="upcoming-title">
            <div className="profile-card__heading">
              <div>
                <p className="profile-section-label">В календаре</p>
                <h2 id="upcoming-title">Ближайшие поездки</h2>
              </div>
              <Link className="profile-inline-link" href="/">
                Найти ещё
              </Link>
            </div>

            <div className="profile-trip-list">
              {upcomingTrips.map((trip, index) => (
                <Link className="profile-trip" href={`/trips/${trip.slug}`} key={trip.id}>
                  <div
                    className="profile-trip__cover"
                    style={{ backgroundImage: `url("/img/Photo${index + 1}.jpg")` }}
                    aria-hidden="true"
                  />
                  <div className="profile-trip__copy">
                    <p>{formatShortDate(trip.startDateTime)}</p>
                    <h3>{trip.title}</h3>
                    <div>
                      <span><PinIcon /> {trip.city}</span>
                      <span><ClockIcon /> {trip.distanceKm} км</span>
                    </div>
                  </div>
                  <Badge tone={trip.difficulty === "easy" ? "success" : "warning"}>
                    {difficultyLabels[trip.difficulty]}
                  </Badge>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <aside className="profile-sidebar">
          <section className="profile-card profile-completeness">
            <div className="profile-completeness__head">
              <h2>Профиль заполнен</h2>
              <strong>85%</strong>
            </div>
            <div className="profile-progress" aria-label="Профиль заполнен на 85%">
              <span />
            </div>
            <p>Добавьте фотографию — участникам будет проще узнать вас на старте.</p>
            <button type="button" className="profile-text-button">Загрузить фото</button>
          </section>

          <section className="profile-card profile-organizer-card">
            <span className="profile-organizer-card__icon" aria-hidden="true">↗</span>
            <h2>Организуете поездки?</h2>
            <p>Управляйте публикациями и заявками участников в кабинете организатора.</p>
            <LinkButton href="/organizer/trips" tone="secondary">
              Открыть кабинет
            </LinkButton>
          </section>

          <nav className="profile-settings" aria-label="Настройки профиля">
            <a href="#notifications">Уведомления <span>›</span></a>
            <a href="#privacy">Приватность <span>›</span></a>
            <a href="#logout">Выйти <span>›</span></a>
          </nav>
        </aside>
      </div>
    </main>
  );
}
