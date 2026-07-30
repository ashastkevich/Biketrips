import { AppTopbar } from "../lib/components";
import { UpcomingTrips } from "./upcoming-trips";
import { getCities, getCurrentUser, getTripDetails } from "../lib/api";
import { fallbackCities } from "../lib/cities";
import { ProfileAccount } from "./profile-account";
import styles from "./profile.module.css";

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
    ? tripsResult.data.filter(
        (trip) =>
          trip.status === "published" &&
          new Date(trip.startDateTime).getTime() > now &&
          trip.participants.some(
            (participant) => participant.userId === user.id && participant.status !== "cancelled"
          )
      )
    : [];
  const createdTrips = user
    ? tripsResult.data.filter((trip) => trip.organizer.userId === user.id)
    : [];
  const upcomingCreatedTrips = createdTrips.filter(
    (trip) =>
      new Date(trip.startDateTime).getTime() > now &&
      trip.status !== "finished" &&
      trip.status !== "cancelled"
  );
  const pastCreatedTrips = createdTrips
    .filter(
      (trip) =>
        new Date(trip.startDateTime).getTime() <= now ||
        trip.status === "finished" ||
        trip.status === "cancelled"
    )
    .sort(
      (left, right) =>
        new Date(right.startDateTime).getTime() - new Date(left.startDateTime).getTime()
    );
  const name = user?.name ?? "Гость";
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <>
      <AppTopbar />

      <main className={`shell app-content-shell ${styles.page}`}>
        <header className={styles.hero}>
          <div className={styles.avatar} aria-hidden="true">
            {initials || "Г"}
          </div>
          <div className={styles.identity}>
            <div className={styles.nameRow}>
              <h1>{name}</h1>
            </div>
          </div>
        </header>

        <div className={styles.layout}>
          <div className={styles.main}>
            {user ? (
              <ProfileAccount initialUser={user} cities={cities} />
            ) : (
              <section className={styles.card} aria-labelledby="profile-data-title">
                <div className={styles.cardHeading}>
                  <div>
                    <p
                      className={`${styles.sectionLabel} ${styles.sectionLabelProfile}`}
                      id="profile-data-title"
                    >
                      Профиль пользователя
                    </p>
                  </div>
                </div>
                <p>Войдите, чтобы увидеть данные учётной записи.</p>
              </section>
            )}

            <section className={styles.card} aria-labelledby="upcoming-title">
              <div className={styles.cardHeading}>
                <div>
                  <p className={styles.sectionLabel}>Вы участник</p>
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

            <section className={styles.card} aria-labelledby="created-trips-title">
              <div className={styles.cardHeading}>
                <div>
                  <p className={styles.sectionLabel}>Вы организатор</p>
                  <h2 id="created-trips-title">Созданные поездки</h2>
                </div>
              </div>
              <section className={styles.tripSubsection} aria-labelledby="created-upcoming-title">
                <h3 id="created-upcoming-title">Предстоящие</h3>
                <UpcomingTrips
                  trips={upcomingCreatedTrips}
                  isAuthenticated={isAuthenticated}
                  currentUserId={user?.id}
                  emptyMessage="У вас пока нет предстоящих созданных поездок."
                  variant="created"
                />
              </section>
              <section className={styles.tripSubsection} aria-labelledby="created-past-title">
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
    </>
  );
}
