import type { TripDetail } from "@biketrips/domain";

import { LinkButton } from "./components";
import styles from "./trip-details.module.css";

/** Imported trips take sign-ups in the organizer's Telegram, not on the site. */
export function ExternalRegistration({ trip }: { trip: TripDetail }) {
  const registrationUrl = trip.externalRegistrationUrl ?? trip.sourceUrl;
  const channelUrl = trip.organizer.kind === "channel" ? trip.organizer.contactUrl : null;

  return (
    <>
      <p className={styles.joinKicker}>
        {trip.status === "cancelled" ? "Поездка отменена" : "Запись у организатора"}
      </p>
      <div className={styles.importNotice}>
        <strong>Анонс из Telegram</strong>
        <p>
          Поездка опубликована в канале{" "}
          {channelUrl ? (
            <a href={channelUrl} target="_blank" rel="noopener noreferrer">
              {trip.organizer.displayName}
            </a>
          ) : (
            trip.organizer.displayName
          )}
          , а не создана на сайте. Запись, вопросы и изменения — у организатора в канале.
        </p>
      </div>
      {registrationUrl && trip.status !== "cancelled" ? (
        <LinkButton className={styles.joinButton} href={registrationUrl} size="large">
          Записаться у организатора
        </LinkButton>
      ) : null}
    </>
  );
}
