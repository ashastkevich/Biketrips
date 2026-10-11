import type { Metadata } from "next";
import type { ParticipantStatus, TripDetail } from "@biketrips/domain";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

import { AppTopbar } from "../../lib/app-topbar";
import { DataNotice, getTripCardProps } from "../../lib/components";
import {
  cancelParticipation,
  getCurrentUser,
  getTrip,
  joinTrip,
  updateParticipantStatus,
  updateTripStatus,
} from "../../lib/api";
import { difficultyLabels } from "../../lib/labels";
import { baseOpenGraph, noIndexMetadata } from "../../lib/site";
import { DEFAULT_TRIP_TIME_ZONE } from "../../lib/trip-time";
import { getTripEditHref, getTripHref } from "../../lib/trip-links";
import { Alert, Button, CapacityIndicator, LinkButton } from "../../ui/components";
import { JoinSignInButton } from "../../ui/join-sign-in-button";
import { OrganizerParticipants } from "../../ui/organizer-participants";
import { TripDetailsCard } from "../../ui/trip-details-card";
import tripDetailsStyles from "../../ui/trip-details.module.css";

interface TripPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const participationTitles: Record<ParticipantStatus, string> = {
  confirmed: "Вы записаны",
  pending: "Заявка отправлена",
  waitlisted: "Вы в листе ожидания",
  cancelled: "Запись отменена",
};

const participationDescriptions: Record<ParticipantStatus, string> = {
  confirmed: "Поездка добавлена в ваш список.",
  pending: "Организатор подтвердит заявку.",
  waitlisted: "Сообщим, если освободится место.",
  cancelled: "",
};

const joinedTitles: Record<ParticipantStatus, string> = {
  confirmed: "Вы записаны на поездку",
  pending: "Заявка отправлена",
  waitlisted: "Вы в листе ожидания",
  cancelled: "Запись отменена",
};

const cancelParticipationLabels: Record<ParticipantStatus, string> = {
  confirmed: "Отменить запись",
  pending: "Отозвать заявку",
  waitlisted: "Покинуть лист ожидания",
  cancelled: "",
};

const participantUpdateNotices: Partial<Record<ParticipantStatus, string>> = {
  confirmed: "Участник подтверждён.",
  cancelled: "Заявка отклонена.",
};

function readQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function describeParticipantUpdateError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("no free places")) {
    return "Свободных мест нет. Увеличьте лимит участников в настройках поездки.";
  }
  return "Не удалось изменить статус участника. Попробуйте ещё раз.";
}

function hasFlag(value: string | string[] | undefined): boolean {
  return value === "1" || (Array.isArray(value) && value.includes("1"));
}

const indexableStatuses = new Set<TripDetail["status"]>(["published", "cancelled", "finished"]);

function isIndexableTrip(trip: TripDetail): boolean {
  return trip.moderationStatus === "approved" && indexableStatuses.has(trip.status);
}

function formatTripDate(startDateTime: string): string {
  return new Date(startDateTime).toLocaleDateString("ru-RU", {
    timeZone: DEFAULT_TRIP_TIME_ZONE,
    day: "numeric",
    month: "long",
  });
}

function describeTrip(trip: TripDetail): string {
  const parts = [
    `Велопоездка ${formatTripDate(trip.startDateTime)}, ${trip.city}`,
    `${trip.distanceKm} км`,
    `сложность: ${difficultyLabels[trip.difficulty].toLowerCase()}`,
  ];
  if (trip.paceMin && trip.paceMax) {
    const pace = trip.paceMin === trip.paceMax ? `${trip.paceMin}` : `${trip.paceMin}–${trip.paceMax}`;
    parts.push(`темп ${pace} км/ч`);
  }
  if (trip.startLocationName) parts.push(`старт: ${trip.startLocationName}`);

  const summary = `${parts.join(", ")}.`;
  const details = trip.description.replace(/\s+/g, " ").trim();
  const text = details ? `${summary} ${details}` : summary;

  return text.length > 200 ? `${text.slice(0, 197).trimEnd()}…` : text;
}

export async function generateMetadata({ params }: TripPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { data: trip } = await getTrip(slug);

  if (!trip) {
    return { title: "Поездка не найдена", ...noIndexMetadata };
  }

  const title = `${trip.title} — ${trip.city}, ${formatTripDate(trip.startDateTime)}`;
  const description = describeTrip(trip);
  const canonical = getTripHref(trip);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { ...baseOpenGraph, type: "article", url: canonical, title, description },
    ...(isIndexableTrip(trip) ? {} : noIndexMetadata),
  };
}

export default async function TripPage({ params, searchParams }: TripPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const [result, currentUser] = await Promise.all([getTrip(slug), getCurrentUser()]);

  if (!result.data) {
    notFound();
  }

  const trip = result.data;
  const coverImage = getTripCardProps(trip).coverImage;
  const isOrganizer = trip.organizer.userId === currentUser?.id;
  const hasParticipantLimit = trip.capacity !== null;
  const placesLeft = Math.max((trip.capacity ?? 0) - trip.confirmedParticipants, 0);
  const waitlist = hasParticipantLimit && placesLeft === 0;
  const canCancelTrip =
    isOrganizer &&
    new Date(trip.startDateTime).getTime() > Date.now() &&
    trip.status !== "cancelled" &&
    trip.status !== "finished";
  const myParticipation = trip.participants.find(
    (participant) => participant.userId === currentUser?.id && participant.status !== "cancelled",
  );
  const canChangeParticipation = trip.status !== "cancelled" && trip.status !== "finished";
  const joinLabel = waitlist ? "Встать в лист ожидания" : "Записаться";
  const participantError = readQueryValue(query.participantError);
  const participantSuccess =
    participantUpdateNotices[readQueryValue(query.participantUpdated) as ParticipantStatus];
  const participantNotice = participantError
    ? { tone: "danger" as const, text: participantError }
    : participantSuccess
      ? { tone: "success" as const, text: participantSuccess }
      : undefined;

  async function joinAction() {
    "use server";

    let destination = `/trips/${slug}?joined=1`;

    try {
      await joinTrip(trip.id);
      // Drop cached feed/profile pages so going back does not show the old signup state.
      revalidatePath("/", "layout");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось записаться";
      destination = `/trips/${slug}?joinError=${encodeURIComponent(message)}`;
    }

    redirect(destination);
  }

  async function cancelParticipationAction() {
    "use server";

    let destination = `/trips/${slug}?left=1`;

    try {
      await cancelParticipation(trip.id);
      revalidatePath("/", "layout");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось отменить запись";
      destination = `/trips/${slug}?leaveError=${encodeURIComponent(message)}`;
    }

    redirect(destination);
  }

  async function updateParticipantAction(formData: FormData) {
    "use server";

    const participantId = formData.get("participantId");
    const status = formData.get("status");

    if (typeof participantId !== "string" || (status !== "confirmed" && status !== "cancelled")) {
      redirect(`/trips/${slug}`);
    }

    let destination = `/trips/${slug}?participantUpdated=${status}`;

    try {
      await updateParticipantStatus(trip.id, participantId, status);
    } catch (error) {
      destination = `/trips/${slug}?participantError=${encodeURIComponent(
        describeParticipantUpdateError(error),
      )}`;
    }

    redirect(destination);
  }

  async function cancelTripAction() {
    "use server";

    let destination = `/trips/${slug}?cancelled=1`;

    try {
      await updateTripStatus(trip.id, "cancel");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось отменить поездку";
      destination = `/trips/${slug}?cancelError=${encodeURIComponent(message)}`;
    }

    redirect(destination);
  }

  return (
    <>
      <AppTopbar />

      <main className="shell app-content-shell detail-shell">
        <DataNotice source={result.source} error={result.error} />
        {hasFlag(query.joined) && myParticipation ? (
          <Alert title={joinedTitles[myParticipation.status]} tone="success">
            {participationDescriptions[myParticipation.status]}
          </Alert>
        ) : null}
        {hasFlag(query.left) && !myParticipation ? (
          <Alert title="Запись отменена" tone="success">
            Если планы изменятся, вы сможете записаться снова.
          </Alert>
        ) : null}
        {query.leaveError ? (
          <Alert title="Не удалось отменить запись" tone="danger">
            {Array.isArray(query.leaveError) ? query.leaveError[0] : query.leaveError}
          </Alert>
        ) : null}
        {query.joinError ? (
          <Alert title="Не удалось записаться" tone="danger">
            {Array.isArray(query.joinError) ? query.joinError[0] : query.joinError}
          </Alert>
        ) : null}
        {hasFlag(query.cancelled) ? (
          <Alert title="Поездка отменена" tone="success">
            Участники увидят обновлённый статус поездки.
          </Alert>
        ) : null}
        {query.cancelError ? (
          <Alert title="Не удалось отменить поездку" tone="danger">
            {Array.isArray(query.cancelError) ? query.cancelError[0] : query.cancelError}
          </Alert>
        ) : null}

        <TripDetailsCard
          trip={trip}
          coverImage={coverImage}
          titleId="trip-page-title"
          headingLevel="h1"
          className={tripDetailsStyles.pageCard}
          aside={
            <aside
              className={tripDetailsStyles.join}
              aria-label={isOrganizer ? "Участники поездки" : "Запись на поездку"}
            >
              {isOrganizer ? (
                <>
                  <p className={tripDetailsStyles.joinKicker}>Участники</p>
                  <p className={tripDetailsStyles.participantCount}>
                    Записались: <strong>{trip.confirmedParticipants}</strong>
                    {hasParticipantLimit ? ` из ${trip.capacity}` : " участников"}
                  </p>
                  {hasParticipantLimit ? (
                    <CapacityIndicator
                      capacity={trip.capacity!}
                      confirmed={trip.confirmedParticipants}
                    />
                  ) : null}
                  <OrganizerParticipants
                    trip={trip}
                    updateAction={canCancelTrip ? updateParticipantAction : undefined}
                    notice={participantNotice}
                  />
                  <LinkButton
                    className={tripDetailsStyles.joinButton}
                    href={getTripEditHref(trip, { returnTo: "/", scope: "feed" })}
                    tone="secondary"
                  >
                    Редактировать поездку
                  </LinkButton>
                  {canCancelTrip ? (
                    <form action={cancelTripAction}>
                      <Button className={tripDetailsStyles.joinButton} tone="danger" type="submit">
                        Отменить поездку
                      </Button>
                    </form>
                  ) : null}
                </>
              ) : (
                <>
                  <p className={tripDetailsStyles.joinKicker}>
                    {myParticipation
                      ? "Ваша запись"
                      : waitlist
                        ? "Места закончились"
                        : "Можно присоединиться"}
                  </p>
                  {hasParticipantLimit ? (
                    <CapacityIndicator
                      capacity={trip.capacity!}
                      confirmed={trip.confirmedParticipants}
                    />
                  ) : (
                    <p className={tripDetailsStyles.participantCount}>
                      Записались: <strong>{trip.confirmedParticipants}</strong> участников
                    </p>
                  )}
                  {myParticipation ? (
                    <div className={tripDetailsStyles.success} role="status">
                      <span aria-hidden="true">✓</span>
                      <h3>{participationTitles[myParticipation.status]}</h3>
                      <p>{participationDescriptions[myParticipation.status]}</p>
                      {canChangeParticipation ? (
                        <form action={cancelParticipationAction}>
                          <Button
                            className={`${tripDetailsStyles.joinButton} ${tripDetailsStyles.successButton}`}
                            tone="secondary"
                            type="submit"
                          >
                            {cancelParticipationLabels[myParticipation.status]}
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  ) : (
                    <>
                      {currentUser ? (
                        <form action={joinAction}>
                          <Button className={tripDetailsStyles.joinButton} size="large" type="submit">
                            {joinLabel}
                          </Button>
                        </form>
                      ) : (
                        <JoinSignInButton
                          className={tripDetailsStyles.joinButton}
                          returnTo={getTripHref(trip)}
                        >
                          {joinLabel}
                        </JoinSignInButton>
                      )}
                      <p className={tripDetailsStyles.joinNote}>
                        {trip.registrationMode === "automatic"
                          ? "Запись подтвердится сразу"
                          : "Организатор подтвердит заявку"}
                      </p>
                      <p className={tripDetailsStyles.contactsNote}>
                        Организатор увидит контакты из вашего{" "}
                        <Link href="/profile">профиля</Link>: телефон, почту и Telegram.
                      </p>
                    </>
                  )}
                </>
              )}
            </aside>
          }
        />
      </main>
    </>
  );
}
