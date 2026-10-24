import { forwardRef, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import type { TripDetail } from "@biketrips/domain";

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

        <div className={styles.hero}>
          {coverImage ? (
            <Image
              className={styles.heroImage}
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
                  {trip.routeDescription ? <p>{trip.routeDescription}</p> : null}
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

            <Link className={styles.organizer} href={getOrganizerHref(trip.organizer.id)}>
              <span className={styles.organizerAvatar} aria-hidden="true">
                {trip.organizer.displayName.slice(0, 1)}
              </span>
              <span>
                <small>Организатор</small>
                <strong>
                  {trip.organizer.displayName}
                  {trip.organizer.isVerified ? <i title="Проверенный организатор">✓</i> : null}
                </strong>
              </span>
            </Link>
          </div>

          {aside}
        </div>
      </section>
    );
  },
);
