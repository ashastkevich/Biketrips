import { forwardRef, type ReactNode } from "react";
import type { TripDetail } from "@biketrips/domain";

import {
  difficultyLabels,
  formatSurfaceComposition,
  unpavedSurfaceDetailLabels,
} from "../lib/labels";

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
    <div className="trip-details-fact">
      <span className="trip-details-fact__icon" aria-hidden="true">{icon}</span>
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
        className={joinClassNames("trip-details-modal", className)}
        role={role}
        aria-modal={ariaModal}
        aria-labelledby={titleId}
        ref={ref}
        tabIndex={tabIndex}
      >
        {overlay}

        <div className="trip-details-modal__hero">
          {coverImage ? <img src={coverImage} alt="" /> : null}
          <div className="trip-details-modal__hero-shade" />
          <div className="trip-details-modal__hero-copy">
            <div className="trip-details-modal__eyebrow">
              <span>{trip.city}</span>
              <span>{difficultyLabels[trip.difficulty]}</span>
            </div>
            <p>{date} · {time}</p>
            <Heading id={titleId}>{trip.title}</Heading>
            <span className="trip-details-modal__location">⌖ {trip.startLocationName}</span>
          </div>
        </div>

        <div className="trip-details-modal__layout">
          <div className="trip-details-modal__content">
            <div className="trip-details-modal__facts" aria-label="Параметры поездки">
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

            <section className="trip-details-section">
              <h3>О поездке</h3>
              <p>{trip.description}</p>
            </section>

            {hasRouteConditions ? (
              <details className="trip-details-disclosure" open>
                <summary>Маршрут и условия <span aria-hidden="true">⌄</span></summary>
                <div className="trip-details-disclosure__body">
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

            <div className="trip-details-organizer">
              <span className="trip-details-organizer__avatar" aria-hidden="true">
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
