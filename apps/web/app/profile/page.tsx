import Link from "next/link";

import { AppTopbar } from "../lib/components";
import { LinkButton } from "../ui/components";
import { UpcomingTrips } from "./upcoming-trips";
import { getCurrentUser, getTripDetails } from "../lib/api";
import { ProfileAccount } from "./profile-account";

export default async function ProfilePage() {
  const [user, tripsResult] = await Promise.all([
    getCurrentUser(),
    getTripDetails(),
  ]);
  const isAuthenticated = user !== null;
  const upcomingTrips = tripsResult.data.slice(0, 2);
  const name = user?.name ?? "Гость";
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <main className="shell profile-page">
      <AppTopbar />

      <header className="profile-hero">
        <div className="profile-avatar" aria-hidden="true">
          {initials || "Г"}
        </div>
        <div className="profile-identity">
          <div className="profile-name-row">
            <h1>{name}</h1>
          </div>
          <p>{user ? "Профиль пользователя" : "Авторизация не выполнена"}</p>
        </div>
      </header>

      <div className="profile-layout">
        <div className="profile-main">
          {user ? (
            <ProfileAccount initialUser={user} />
          ) : (
            <section className="profile-card" aria-labelledby="profile-data-title">
              <div className="profile-card__heading">
                <div>
                  <p className="profile-section-label">Учётная запись</p>
                  <h2 id="profile-data-title">Данные пользователя</h2>
                </div>
              </div>
              <p>Войдите, чтобы увидеть данные учётной записи.</p>
            </section>
          )}

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

            <UpcomingTrips
              trips={upcomingTrips}
              isAuthenticated={isAuthenticated}
              currentUserId={user?.id}
            />
          </section>
        </div>

        <aside className="profile-sidebar">
          <section className="profile-card profile-organizer-card">
            <span className="profile-organizer-card__icon" aria-hidden="true">↗</span>
            <h2>Организуете поездки?</h2>
            <p>Управляйте публикациями и заявками участников в кабинете организатора.</p>
            <LinkButton href="/organizer/trips" tone="secondary">
              Открыть кабинет
            </LinkButton>
          </section>
        </aside>
      </div>
    </main>
  );
}
