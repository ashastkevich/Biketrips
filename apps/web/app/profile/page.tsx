import type { Metadata } from "next";
import { noIndexMetadata } from "../lib/site";
import { AppTopbar } from "../lib/app-topbar";
import { UpcomingTrips } from "./upcoming-trips";
import { redirect } from "next/navigation";
import Link from "next/link";

import { organizerBioMaxLength } from "@biketrips/domain";

import {
  getCities,
  getCurrentUser,
  getMyOrganizerProfile,
  getMyTrips,
  submitTripForReview,
  updateMyOrganizerBio,
  withdrawTripReview,
} from "../lib/api";
import { fallbackCities } from "../lib/cities";
import { getOrganizerHref } from "../lib/organizer-links";
import { Badge } from "../ui/components";
import { OrganizerBio, type OrganizerBioState } from "./organizer-bio";
import { getOrganizerTripState } from "./organizer-trip-state";
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

async function submitDraftAction(formData: FormData) {
  "use server";
  const tripId = formData.get("tripId");
  if (typeof tripId === "string" && tripId) await submitTripForReview(tripId);
  redirect("/profile?submitted=1");
}

async function updateOrganizerBioAction(
  _state: OrganizerBioState,
  formData: FormData,
): Promise<OrganizerBioState> {
  "use server";
  const bio = formData.get("bio");
  const value = typeof bio === "string" ? bio.trim() : "";
  if (value.length > organizerBioMaxLength) {
    return { bio: value, error: `Описание не длиннее ${organizerBioMaxLength} символов` };
  }

  try {
    const profile = await updateMyOrganizerBio(value);
    return { bio: profile.bio ?? "" };
  } catch {
    return { bio: value, error: "Не удалось сохранить описание. Попробуйте ещё раз." };
  }
}

interface ProfilePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const query = await searchParams;
  const [user, tripsResult, citiesResult, organizerProfile] = await Promise.all([
    getCurrentUser(),
    getMyTrips(),
    getCities(),
    getMyOrganizerProfile(),
  ]);
  const cities = citiesResult.data.length > 0 ? citiesResult.data : fallbackCities;
  const isAuthenticated = user !== null;
  const now = Date.now();
  const upcomingTrips = user
    ? tripsResult.data.filter(
        (trip) =>
          trip.status === "published" &&
          trip.organizer.userId !== user.id &&
          new Date(trip.startDateTime).getTime() > now &&
          trip.participants.some(
            (participant) => participant.userId === user.id && participant.status !== "cancelled"
          )
      )
    : [];
  const createdTrips = user
    ? tripsResult.data.filter((trip) => trip.organizer.userId === user.id)
    : [];
  const upcomingCreatedTrips = createdTrips
    .filter(
      (trip) =>
        new Date(trip.startDateTime).getTime() > now &&
        trip.status !== "finished" &&
        trip.status !== "cancelled"
    )
    .map((trip) => ({ trip, state: getOrganizerTripState(trip, now) }))
    .sort(
      (left, right) =>
        left.state.priority - right.state.priority ||
        new Date(left.trip.startDateTime).getTime() - new Date(right.trip.startDateTime).getTime()
    );
  const attentionCount = upcomingCreatedTrips.filter(({ state }) => state.needsAttention).length;
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
        {query.submitted === "1" ? (
          <div className={styles.pageNotice}>Поездка отправлена администратору на модерацию.</div>
        ) : null}
        {query.withdrawn === "1" ? (
          <div className={styles.pageNotice}>Заявка отозвана, поездка сохранена как черновик. Внесите правки и отправьте её на
            модерацию снова.</div>
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
              <Link className={styles.adminLink} href="/admin/moderation">Открыть модерацию поездок</Link>
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

            {organizerProfile ? (
              <OrganizerBio
                organizerHref={getOrganizerHref(organizerProfile.id)}
                initialBio={organizerProfile.bio ?? ""}
                action={updateOrganizerBioAction}
              />
            ) : null}

            <section className={styles.card} aria-labelledby="created-trips-title">
              <div className={styles.cardHeading}>
                <div>
                  <p className={styles.sectionLabel}>Вы организатор</p>
                  <h2 id="created-trips-title">Созданные поездки</h2>
                </div>
                {attentionCount > 0 ? (
                  <Badge tone="warning" dot>
                    Требуют внимания: {attentionCount}
                  </Badge>
                ) : null}
              </div>
              <section className={styles.tripSubsection} aria-labelledby="created-upcoming-title">
                <h3 id="created-upcoming-title">Предстоящие</h3>
                <UpcomingTrips
                  trips={upcomingCreatedTrips.map(({ trip }) => trip)}
                  isAuthenticated={isAuthenticated}
                  currentUserId={user?.id}
                  emptyMessage="У вас пока нет предстоящих созданных поездок."
                  variant="created"
                  now={now}
                  submitAction={submitDraftAction}
                  withdrawAction={withdrawReviewAction}
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
                  now={now}
                />
              </section>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
