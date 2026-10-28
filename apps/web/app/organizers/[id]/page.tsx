import type { Metadata } from "next";
import type { TripSummary } from "@biketrips/domain";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getCurrentUser, getOrganizerProfile } from "../../lib/api";
import { AppTopbar } from "../../lib/app-topbar";
import { getTripCardProps } from "../../lib/components";
import {
  describeOrganizer,
  formatOrganizingSince,
  getOrganizerHref,
  hasPublicTrips,
} from "../../lib/organizer-links";
import { getParticipantInitials } from "../../lib/participant-groups";
import { baseOpenGraph, noIndexMetadata } from "../../lib/site";
import { getOrganizerJsonLd } from "../../lib/structured-data";
import { Badge, TripCard } from "../../ui/components";
import { JsonLd } from "../../ui/json-ld";
import styles from "./organizer.module.css";

interface OrganizerPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: OrganizerPageProps): Promise<Metadata> {
  const { id } = await params;
  const { data: profile } = await getOrganizerProfile(id);

  if (!profile) {
    return { title: "Организатор не найден", ...noIndexMetadata };
  }

  const title = `${profile.displayName} — организатор велопоездок`;
  const description = describeOrganizer(profile);
  const canonical = getOrganizerHref(profile.id);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { ...baseOpenGraph, type: "profile", url: canonical, title, description },
    ...(hasPublicTrips(profile) ? {} : noIndexMetadata),
  };
}

export default async function OrganizerPage({ params }: OrganizerPageProps) {
  const { id } = await params;
  const [{ data: profile }, currentUser] = await Promise.all([getOrganizerProfile(id), getCurrentUser()]);

  if (!profile) {
    notFound();
  }

  const isOwner = currentUser?.id === profile.userId;
  const meta = [profile.city, `Организует поездки с ${formatOrganizingSince(profile.organizingSince)}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <AppTopbar />

      <main className={`shell app-content-shell ${styles.page}`}>
        {hasPublicTrips(profile) ? <JsonLd data={getOrganizerJsonLd(profile)} /> : null}
        <header className={styles.hero}>
          {profile.avatarUrl ? (
            // Telegram avatars live on an external host that next/image is not configured for.
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.avatar} src={profile.avatarUrl} alt="" referrerPolicy="no-referrer" />
          ) : (
            <div className={styles.avatar} aria-hidden="true">
              {getParticipantInitials(profile.displayName) || "О"}
            </div>
          )}
          <div className={styles.identity}>
            <p className={styles.eyebrow}>Организатор</p>
            <div className={styles.nameRow}>
              <h1>{profile.displayName}</h1>
              {profile.isVerified ? <Badge tone="success">Проверенный организатор</Badge> : null}
            </div>
            <p className={styles.meta}>{meta}</p>
            {isOwner ? (
              <Link className={styles.ownerLink} href="/profile#organizer-profile">
                Это ваша страница — изменить описание
              </Link>
            ) : null}
          </div>
        </header>

        {profile.isClaimable ? (
          <section className={styles.claim}>
            <p>
              Профиль создан автоматически по анонсам поездок в Telegram. Если это вы, войдите
              через Telegram — профиль и поездки перейдут в ваш аккаунт.
            </p>
            <Link className={styles.claimLink} href="/auth/telegram?returnTo=/profile">
              Войти через Telegram
            </Link>
          </section>
        ) : null}

        <dl className={styles.stats}>
          <div>
            <dt>Предстоящих поездок</dt>
            <dd>{profile.upcomingTrips.length}</dd>
          </div>
          <div>
            <dt>Проведено поездок</dt>
            <dd>{profile.completedTripsCount}</dd>
          </div>
        </dl>

        {profile.bio ? (
          <section className={styles.card} aria-labelledby="organizer-bio-title">
            <h2 id="organizer-bio-title">О себе</h2>
            <p className={styles.bio}>{profile.bio}</p>
          </section>
        ) : null}

        {hasPublicTrips(profile) ? (
          <>
            <TripSection id="organizer-upcoming-title" title="Ближайшие поездки" trips={profile.upcomingTrips} linked>
              <p className={styles.empty}>Новых поездок пока нет — загляните позже.</p>
            </TripSection>
            {profile.pastTrips.length > 0 ? (
              <TripSection id="organizer-past-title" title="Прошедшие поездки" trips={profile.pastTrips} />
            ) : null}
          </>
        ) : (
          <section className={styles.card}>
            <h2>Пока нет поездок</h2>
            <p className={styles.empty}>Когда организатор опубликует поездку, она появится здесь.</p>
          </section>
        )}
      </main>
    </>
  );
}

function TripSection({
  id,
  title,
  trips,
  linked = false,
  children,
}: {
  id: string;
  title: string;
  trips: TripSummary[];
  /** Past trip pages are not public, so only upcoming trips link to their page. */
  linked?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <section className={styles.tripSection} aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {trips.length > 0 ? (
        <div className={styles.trips}>
          {trips.map((trip) => {
            const cardProps = getTripCardProps(trip);
            return <TripCard key={trip.id} {...cardProps} href={linked ? cardProps.href : undefined} />;
          })}
        </div>
      ) : (
        children
      )}
    </section>
  );
}
