import { forwardRef, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import type { TripDetail, TripOrganizer } from "@biketrips/domain";

import {
  difficultyLabels,
  formatDistance,
  formatSurfaceComposition,
  unpavedSurfaceDetailLabels,
} from "../lib/labels";
import { getOrganizerHref } from "../lib/organizer-links";
import { FormattedText } from "./formatted-text";
import { DEFAULT_TRIP_TIME_ZONE } from "../lib/trip-time";
import { tripHeroImageSizes } from "./trip-hero-image";
import { TripStartRoute } from "./trip-start-route";
import styles from "./trip-details.module.css";

interface TripDetailsCardProps {
  trip: TripDetail;
  titleId: string;
  aside: ReactNode;
  coverImage?: string;
  className?: string;
  headingLevel?: "h1" | "h2";
  overlay?: ReactNode;
  role?: string;
  ariaModal?: boolean;
  tabIndex?: number;
}

function Fact({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className={styles.fact}>
      <span className={styles.factIcon} aria-hidden="true">{icon}</span>
      <span><small>{label}</small><strong>{value}</strong></span>
    </div>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M20.7 3.6 2.9 10.5c-1.2.5-1.2 1.2-.2 1.5l4.6 1.4 1.8 5.4c.2.6.1.9.8.9.5 0 .7-.2 1-.5l2.2-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.1-14.5c.3-1.3-.5-1.9-1.9-1.6Zm-3.4 4-8.6 7.8-.3 3.4-1.5-4.6 10-6.3c.5-.3.9-.1.4.3Z" />
    </svg>
  );
}

function OrganizerLink({ organizer }: { organizer: TripOrganizer }) {
  return (
    <Link className={styles.organizer} href={getOrganizerHref(organizer.id)}>
      <span className={styles.organizerAvatar} aria-hidden="true">
        {organizer.displayName.replace(/^@/, "").slice(0, 1)}
      </span>
      <span>
        <small>Организатор</small>
        <strong>
          {organizer.displayName}
          {organizer.isVerified ? <i title="Проверенный организатор">✓</i> : null}
        </strong>
      </span>
    </Link>
  );
}

function UnknownOrganizer() {
  return (
    <div className={joinClassNames(styles.organizer, styles.organizerUnknown)}>
      <span className={styles.organizerAvatar} aria-hidden="true">?</span>
      <span>
        <small>Организатор</small>
        <strong>Не указано</strong>
      </span>
    </div>
  );
}

/** The Telegram channel an imported trip came from, next to whoever its post names as organizer. */
function TripSource({ trip }: { trip: TripDetail }) {
  const channelUrl = trip.organizer.kind === "channel" ? trip.organizer.contactUrl : null;

  return (
    <div className={styles.source}>
      <span className={styles.sourceIcon}>
        <TelegramIcon />
      </span>
      <span>
        <small>Источник · Telegram-канал</small>
        <strong>
          {channelUrl ? (
            <a href={channelUrl} target="_blank" rel="noopener noreferrer">
              {trip.organizer.displayName}
            </a>
          ) : (
            trip.organizer.displayName
          )}
        </strong>
      </span>
      {trip.sourceUrl ? (
        <a
          className={styles.sourcePost}
          href={trip.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Исходный пост ↗
        </a>
      ) : null}
    </div>
  );
}

function joinClassNames(...values: Array<string | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export const TripDetailsCard = forwardRef<HTMLElement, TripDetailsCardProps>(
  function TripDetailsCard(
    {
      trip,
      titleId,
      aside,
      coverImage,
      className,
      headingLevel = "h2",
      overlay,
      role,
      ariaModal,
      tabIndex,
    },
    ref,
  ) {
    const Heading = headingLevel;
    const date = new Intl.DateTimeFormat("ru-RU", {
      timeZone: DEFAULT_TRIP_TIME_ZONE,
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date(trip.startDateTime));
    const time = new Intl.DateTimeFormat("ru-RU", {
      timeZone: DEFAULT_TRIP_TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(trip.startDateTime));
    // Imported posters are square or portrait: show them whole next to the title,
    // on a blurred copy of themselves, instead of cropping them behind it.
    const fitCover = Boolean(coverImage) && trip.source !== "native";
    const hasRouteConditions = Boolean(
      trip.routeDescription ||
        trip.equipmentRequirements ||
        trip.rules ||
        trip.unpavedSurfaceDetails.length,
    );

    return (
      <section
        className={joinClassNames(styles.card, className)}
        role={role}
        aria-modal={ariaModal}
        aria-labelledby={titleId}
        ref={ref}
        tabIndex={tabIndex}
      >
        {overlay}

        <div className={joinClassNames(styles.hero, fitCover ? styles.heroFit : undefined)}>
          {coverImage ? (
            <Image
              className={fitCover ? styles.heroBackdrop : styles.heroImage}
              src={coverImage}
              alt=""
              fill
              sizes={tripHeroImageSizes}
              // The hero is the first thing shown on the trip page and in the modal.
              preload
              fetchPriority="high"
            />
          ) : null}
          <div className={styles.heroShade} />
          {coverImage && fitCover ? (
            <div className={styles.heroPoster}>
              <Image
                className={styles.heroPosterImage}
                src={coverImage}
                alt=""
                fill
                sizes={tripHeroImageSizes}
              />
            </div>
          ) : null}
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>
              <span>{trip.city}</span>
              {trip.difficulty ? <span>{difficultyLabels[trip.difficulty]}</span> : null}
            </div>
            <p>{date} · {time}</p>
            <Heading id={titleId}>{trip.title}</Heading>
            <span className={styles.location}>⌖ {trip.startLocationName}</span>
          </div>
        </div>

        <div className={styles.layout}>
          <div className={styles.content}>
            <div className={styles.facts} aria-label="Параметры поездки">
              <Fact icon="↔" label="Дистанция" value={formatDistance(trip.distanceKm)} />
              <Fact
                icon="◷"
                label="Темп"
                value={trip.paceMin && trip.paceMax ? `${trip.paceMin}–${trip.paceMax} км/ч` : "Свободный"}
              />
              <Fact
                icon="≈"
                label="Покрытие"
                value={formatSurfaceComposition(trip.asphaltPercent, trip.unpavedPercent)}
              />
            </div>

            <section className={styles.section}>
              <h3>О поездке</h3>
              <FormattedText text={trip.description} />
            </section>

            <TripStartRoute
              startLocationName={trip.startLocationName}
              startTime={time}
              startLat={trip.startLat}
              startLng={trip.startLng}
              gpxFileName={trip.routeGpxFileName}
              gpxDownloadUrl={trip.routeGpxDownloadUrl}
            />

            {hasRouteConditions ? (
              <details className={styles.disclosure} open>
                <summary>Маршрут и условия <span aria-hidden="true">⌄</span></summary>
                <div className={styles.disclosureBody}>
                  {trip.routeDescription ? <FormattedText text={trip.routeDescription} /> : null}
                  <dl>
                    {trip.unpavedSurfaceDetails.length > 0 ? (
                      <div>
                        <dt>Грунтовая часть</dt>
                        <dd>
                          {trip.unpavedSurfaceDetails
                            .map((detail) => unpavedSurfaceDetailLabels[detail])
                            .join(", ")}
                        </dd>
                      </div>
                    ) : null}
                    {trip.equipmentRequirements ? (
                      <div><dt>Что взять</dt><dd>{trip.equipmentRequirements}</dd></div>
                    ) : null}
                    {trip.rules ? (
                      <div><dt>Правила группы</dt><dd>{trip.rules}</dd></div>
                    ) : null}
                  </dl>
                </div>
              </details>
            ) : null}

            {trip.source === "native" ? (
              <OrganizerLink organizer={trip.organizer} />
            ) : (
              <div className={styles.importedPeople}>
                {trip.importedOrganizer ? (
                  <OrganizerLink organizer={trip.importedOrganizer} />
                ) : (
                  <UnknownOrganizer />
                )}
                <TripSource trip={trip} />
              </div>
            )}
          </div>

          {aside}
        </div>
      </section>
    );
  },
);
