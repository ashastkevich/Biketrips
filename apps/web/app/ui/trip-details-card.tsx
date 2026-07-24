import { forwardRef, type ReactNode } from "react";
import Image from "next/image";
import type { TripDetail } from "@biketrips/domain";

import {
  difficultyLabels,
  formatSurfaceComposition,
  unpavedSurfaceDetailLabels,
} from "../lib/labels";
import { RouteMapToggle } from "./route-map-toggle";
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
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date(trip.startDateTime));
    const time = new Intl.DateTimeFormat("ru-RU", {
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
              sizes="(max-width: 760px) 100vw, 1040px"
              priority={headingLevel === "h1"}
            />
          ) : null}
          <div className={styles.heroShade} />
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>
              <span>{trip.city}</span>
              <span>{difficultyLabels[trip.difficulty]}</span>
            </div>
            <p>{date} · {time}</p>
            <Heading id={titleId}>{trip.title}</Heading>
            <span className={styles.location}>⌖ {trip.startLocationName}</span>
          </div>
        </div>

        <div className={styles.layout}>
          <div className={styles.content}>
            <div className={styles.facts} aria-label="Параметры поездки">
              <Fact icon="↔" label="Дистанция" value={`${trip.distanceKm} км`} />
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
              <p>{trip.description}</p>
            </section>

            {trip.routeGpxDownloadUrl ? (
              <section className={styles.section}>
                <h3>Карта маршрута</h3>
                <p>{trip.routeGpxFileName ?? "GPX-файл маршрута"} загружен организатором.</p>
                <RouteMapToggle
                  fileName={trip.routeGpxFileName}
                  downloadUrl={trip.routeGpxDownloadUrl}
                />
              </section>
            ) : null}

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

            <div className={styles.organizer}>
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
            </div>
          </div>

          {aside}
        </div>
      </section>
    );
  },
);
