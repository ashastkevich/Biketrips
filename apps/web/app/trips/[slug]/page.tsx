import { notFound, redirect } from "next/navigation";

import { AppTopbar, DataNotice, getTripCardProps } from "../../lib/components";
import { getCurrentUser, getTrip, joinTrip, updateTripStatus } from "../../lib/api";
import { readParticipantInput } from "../../lib/form-data";
import {
  Alert,
  Button,
  CapacityIndicator,
  LinkButton,
  TextField,
} from "../../ui/components";
import { TripDetailsCard } from "../../ui/trip-details-card";

interface TripPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function hasFlag(value: string | string[] | undefined): boolean {
  return value === "1" || (Array.isArray(value) && value.includes("1"));
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
  async function joinAction(formData: FormData) {
    "use server";

    let destination = `/trips/${slug}?joined=1`;

    try {
      await joinTrip(trip.id, readParticipantInput(formData));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось записаться";
      destination = `/trips/${slug}?joinError=${encodeURIComponent(message)}`;
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
    <main className="shell detail-shell">
      <AppTopbar />

      <DataNotice source={result.source} error={result.error} />
      {hasFlag(query.joined) ? (
        <Alert title="Заявка отправлена" tone="success">
          {waitlist ? "Вы в листе ожидания. Сообщим, если освободится место." : "Эта поездка добавлена в ваш список."}
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
        className="trip-details-page-card"
        aside={
          <aside
            className="trip-details-modal__join"
            aria-label={isOrganizer ? "Участники поездки" : "Запись на поездку"}
          >
            {isOrganizer ? (
              <>
                <p className="trip-details-modal__join-kicker">Участники</p>
                <p className="trip-details-modal__participant-count">
                  Записались: <strong>{trip.confirmedParticipants}</strong>
                  {hasParticipantLimit ? ` из ${trip.capacity}` : " участников"}
                </p>
                {hasParticipantLimit ? (
                  <CapacityIndicator capacity={trip.capacity!} confirmed={trip.confirmedParticipants} />
                ) : null}
                <LinkButton href={`/trips/${encodeURIComponent(trip.slug)}/edit?returnTo=/&scope=feed`} tone="secondary">
                  Редактировать поездку
                </LinkButton>
                {canCancelTrip ? (
                  <form action={cancelTripAction}>
                    <Button tone="danger" type="submit">
                      Отменить поездку
                    </Button>
                  </form>
                ) : null}
              </>
            ) : (
              <>
                <p className="trip-details-modal__join-kicker">
                  {waitlist ? "Места закончились" : "Можно присоединиться"}
                </p>
                {hasParticipantLimit ? (
                  <CapacityIndicator capacity={trip.capacity!} confirmed={trip.confirmedParticipants} />
                ) : (
                  <p className="trip-details-modal__participant-count">
                    Записались: <strong>{trip.confirmedParticipants}</strong> участников
                  </p>
                )}
                <form action={joinAction} className="trip-details-join-form trip-details-page-form">
                  <input name="userId" type="hidden" value={`web-${trip.id}`} />
                  <label>
                    <span>Как вас зовут</span>
                    <TextField name="name" required minLength={2} placeholder="Алексей" />
                  </label>
                  <label>
                    <span>Telegram</span>
                    <TextField name="telegramUsername" required placeholder="@username" />
                  </label>
                  <Button type="submit">
                    {waitlist ? "Встать в лист ожидания" : "Записаться"}
                  </Button>
                  <small>Контакт увидит только организатор.</small>
                </form>
                <p className="trip-details-modal__join-note">
                  {trip.registrationMode === "automatic" ? "Запись подтвердится сразу" : "Организатор подтвердит заявку"}
                </p>
              </>
            )}
          </aside>
        }
      />
    </main>
  );
}
