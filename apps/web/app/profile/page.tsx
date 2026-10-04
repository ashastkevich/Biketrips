import type { Metadata } from "next";
import { noIndexMetadata } from "../lib/site";
import { AppTopbar } from "../lib/components";
import { UpcomingTrips } from "./upcoming-trips";
import { redirect } from "next/navigation";

import { getCities, getCurrentUser, getMyTrips, withdrawTripReview } from "../lib/api";
import { fallbackCities } from "../lib/cities";
import { ProfileAccount } from "./profile-account";
import styles from "./profile.module.css";

export const metadata: Metadata = {
  title: "Профиль",
  ...noIndexMetadata,
};

async function withdrawReviewAction(formData: FormData) {
  "use server";
  const tripId = formData.get("tripId");
  if (typeof tripId === "string" && tripId) await withdrawTripReview(tripId);
  redirect("/profile?withdrawn=1");
}

interface ProfilePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const query = await searchParams;
  const [user, tripsResult, citiesResult] = await Promise.all([
    getCurrentUser(),
    getMyTrips(),
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
      <AppTopbar isAuthorized={isAuthenticated} />

      <main className={`shell app-content-shell ${styles.page}`}>
        {query.submitted === "1" ? (
          <div className={styles.pageNotice}>Поездка отправлена администратору на модерацию.</div>
        ) : null}
        {query.withdrawn === "1" ? (
          <div className={styles.pageNotice}>Заявка отозвана и снова сохранена как черновик.</div>
        ) : null}
        <header className={styles.hero}>
          <div className={styles.avatar} aria-hidden="true">
            {initials || "Г"}
          </div>
          <div className={styles.identity}>
            <div className={styles.nameRow}>
              <h1>{name}</h1>
            </div>
            {user?.role === "admin" ? (
              <a className={styles.adminLink} href="/admin/moderation">Открыть модерацию поездок</a>
            ) : null}
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
              {createdTrips.some((trip) => trip.moderationStatus !== "approved") ? (
                <div className={styles.moderationNotices}>
                  {createdTrips
                    .filter((trip) => trip.moderationStatus !== "approved")
                    .map((trip) => (
                      <article className={styles.moderationNotice} key={trip.id}>
                        <div>
                          <strong>{trip.title}</strong>
                          <p>
                            {trip.moderationStatus === "pending_review"
                              ? "Поездка ожидает проверки администратора."
                              : trip.moderationStatus === "changes_requested"
                                ? "Администратор вернул поездку на исправление."
                                : trip.moderationStatus === "rejected"
                                  ? "Администратор окончательно отклонил поездку."
                                  : "Поездка сохранена как черновик."}
                          </p>
                          {trip.moderationComment ? <blockquote>{trip.moderationComment}</blockquote> : null}
                        </div>
                        {trip.moderationStatus === "pending_review" ? (
                          <form action={withdrawReviewAction}>
                            <input name="tripId" type="hidden" value={trip.id} />
                            <button type="submit">Отозвать заявку</button>
                          </form>
                        ) : null}
                      </article>
                    ))}
                </div>
              ) : null}
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
