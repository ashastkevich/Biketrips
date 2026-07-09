import { AppTopbar } from "../lib/components";
import { UpcomingTrips } from "./upcoming-trips";
import { getCities, getCurrentUser, getTripDetails } from "../lib/api";
import { fallbackCities } from "../lib/cities";
import { ProfileAccount } from "./profile-account";

export default async function ProfilePage() {
  const [user, tripsResult, citiesResult] = await Promise.all([
    getCurrentUser(),
    getTripDetails({ includeDrafts: true }),
    getCities(),
  ]);
  const cities = citiesResult.data.length > 0 ? citiesResult.data : fallbackCities;
  const isAuthenticated = user !== null;
  const now = Date.now();
  const upcomingTrips = user
    ? tripsResult.data.filter((trip) =>
        trip.status === "published" &&
        new Date(trip.startDateTime).getTime() > now &&
        trip.participants.some(
          (participant) =>
            participant.userId === user.id && participant.status !== "cancelled",
        ),
      )
    : [];
  const createdTrips = user
    ? tripsResult.data.filter((trip) => trip.organizer.userId === user.id)
    : [];
  const upcomingCreatedTrips = createdTrips.filter(
    (trip) =>
      new Date(trip.startDateTime).getTime() > now &&
      trip.status !== "finished" &&
      trip.status !== "cancelled",
  );
  const pastCreatedTrips = createdTrips.filter(
    (trip) =>
      new Date(trip.startDateTime).getTime() <= now ||
      trip.status === "finished" ||
      trip.status === "cancelled",
  ).sort(
    (left, right) =>
      new Date(right.startDateTime).getTime() - new Date(left.startDateTime).getTime(),
  );
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
        </div>
      </header>

      <div className="profile-layout">
        <div className="profile-main">
          {user ? (
            <ProfileAccount initialUser={user} cities={cities} />
          ) : (
            <section className="profile-card" aria-labelledby="profile-data-title">
              <div className="profile-card__heading">
                <div>
                  <p
                    className="profile-section-label profile-section-label--profile"
                    id="profile-data-title"
                  >
                    Профиль пользователя
                  </p>
                </div>
              </div>
              <p>Войдите, чтобы увидеть данные учётной записи.</p>
            </section>
          )}

          <section className="profile-card" aria-labelledby="upcoming-title">
            <div className="profile-card__heading">
              <div>
                <p className="profile-section-label">Вы организатор</p>
                <h2 id="upcoming-title">Ближайшие поездки</h2>
              </div>
            </div>

            <UpcomingTrips
              trips={upcomingTrips}
              isAuthenticated={isAuthenticated}
              currentUserId={user?.id}
              emptyMessage="У вас пока нет предстоящих поездок, на которые вы записаны."
            />
          </section>

          <section className="profile-card" aria-labelledby="created-trips-title">
            <div className="profile-card__heading">
              <div>
                <p className="profile-section-label">Вы организатор</p>
                <h2 id="created-trips-title">Созданные поездки</h2>
              </div>
            </div>
            <section className="profile-trip-subsection" aria-labelledby="created-upcoming-title">
              <h3 id="created-upcoming-title">Предстоящие</h3>
              <UpcomingTrips
                trips={upcomingCreatedTrips}
                isAuthenticated={isAuthenticated}
                currentUserId={user?.id}
                emptyMessage="У вас пока нет предстоящих созданных поездок."
                variant="created"
              />
            </section>
            <section className="profile-trip-subsection" aria-labelledby="created-past-title">
              <h3 id="created-past-title">Прошедшие</h3>
              <UpcomingTrips
                trips={pastCreatedTrips}
                isAuthenticated={isAuthenticated}
                currentUserId={user?.id}
                emptyMessage="У вас пока нет прошедших созданных поездок."
                variant="created"
              />
            </section>
          </section>
        </div>
      </div>
    </main>
  );
}
