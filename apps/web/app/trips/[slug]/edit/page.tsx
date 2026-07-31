import { redirect } from "next/navigation";
import type { TripDetail, UpdateTripInput } from "@biketrips/domain";

import { fallbackCities } from "../../../lib/cities";
import {
  getCities,
  getCurrentUser,
  getTrip,
  updateTrip,
  updateTripWithRouteFile,
} from "../../../lib/api";
import { AppTopbar } from "../../../lib/components";
import { readOptionalFile, readString, readTripUpdateInput } from "../../../lib/form-data";
import { getTripHref, getTripReference } from "../../../lib/trip-links";
import { Alert, LinkButton } from "../../../ui/components";
import { TripCreationWizard, type TripDraft } from "../../new/trip-creation-wizard";
import { SavedTripConfirmation } from "./saved-trip-confirmation";

function getLocalStartValues(startDateTime: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(startDateTime));
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    time: `${value("hour")}:${value("minute")}`,
  };
}

interface EditTripPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function decodeTripReference(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getChangedFields(
  trip: TripDetail,
  input: UpdateTripInput,
  formData: FormData,
  originalLocalStart: string
): string[] {
  const changes: string[] = [];
  const differs = (left: unknown, right: unknown) => left !== right;
  const optional = (value: string | null | undefined) => value ?? "";

  if (differs(trip.title, input.title)) changes.push("Название");
  if (differs(trip.cityId, input.cityId)) changes.push("Город");
  if (differs(originalLocalStart, input.startAt)) changes.push("Дата или время старта");
  if (
    differs(trip.startLocationName, input.startLocationName) ||
    differs(trip.startLat, input.startLat ?? null) ||
    differs(trip.startLng, input.startLng ?? null)
  ) {
    changes.push("Место старта");
  }
  if (differs(trip.distanceKm, input.distanceKm)) changes.push("Дистанция");
  if (
    differs(trip.paceMin, input.paceMin ?? null) ||
    differs(trip.paceMax, input.paceMax ?? null)
  ) {
    changes.push("Темп");
  }
  if (differs(trip.difficulty, input.difficulty)) changes.push("Сложность");
  if (
    differs(trip.asphaltPercent, input.asphaltPercent) ||
    differs(trip.unpavedPercent, input.unpavedPercent) ||
    JSON.stringify([...trip.unpavedSurfaceDetails].sort()) !==
      JSON.stringify([...(input.unpavedSurfaceDetails ?? [])].sort())
  ) {
    changes.push("Покрытие");
  }
  if (differs(trip.dropPolicy, input.dropPolicy)) changes.push("Формат движения");
  if (differs(trip.capacity, input.maxParticipants ?? null)) changes.push("Лимит мест");
  if (differs(trip.registrationMode, input.registrationMode)) changes.push("Режим регистрации");
  const coverImageChanged =
    differs(optional(trip.coverImage), optional(input.coverImage)) ||
    (formData.get("coverImageFile") instanceof File &&
      (formData.get("coverImageFile") as File).size > 0);
  if (coverImageChanged) changes.push("Обложка");
  if (differs(trip.description, input.description)) changes.push("Описание");
  if (differs(optional(trip.routeDescription), optional(input.routeDescription))) {
    changes.push("Маршрут");
  }
  if (
    formData.get("routeGpxFile") instanceof File &&
    (formData.get("routeGpxFile") as File).size > 0
  ) {
    changes.push("GPX-маршрут");
  }
  if (readString(formData, "removeRouteGpx") === "true" && trip.routeGpxFileName) {
    changes.push("GPX-маршрут");
  }
  if (differs(optional(trip.equipmentRequirements), optional(input.equipmentRequirements))) {
    changes.push("Требования к снаряжению");
  }
  if (differs(optional(trip.rules), optional(input.rules))) changes.push("Правила группы");

  return changes;
}

export default async function EditTripPage({ params, searchParams }: EditTripPageProps) {
  const resolvedParams = await params;
  const decodedTripReference = decodeTripReference(resolvedParams.slug);
  const [{ slug: tripReference }, query, tripResult, citiesResult, user] = await Promise.all([
    Promise.resolve({ slug: decodedTripReference }),
    searchParams,
    getTrip(decodedTripReference),
    getCities(),
    getCurrentUser(),
  ]);
  const trip = tripResult.data;

  if (!trip) {
    return (
      <>
        <AppTopbar isAuthorized={user !== null} showCreateAction={false} />

        <main className="shell app-content-shell">
          <Alert title="Не удалось загрузить поездку" tone="danger">
            {tripResult.error ??
              "API поездок временно недоступен. Попробуйте открыть редактор ещё раз."}
          </Alert>
          <LinkButton href="/profile" tone="secondary">
            Вернуться в профиль
          </LinkButton>
        </main>
      </>
    );
  }
  if (!user) {
    redirect(`/auth/telegram?returnTo=${encodeURIComponent(`/trips/${tripReference}/edit`)}`);
  }
  if (trip.organizer.userId !== user.id && user.role !== "admin") redirect("/profile");

  const canEdit =
    new Date(trip.startDateTime).getTime() > Date.now() &&
    trip.status !== "cancelled" &&
    trip.status !== "finished";
  const cities = citiesResult.data.length > 0 ? citiesResult.data : fallbackCities;
  const city = cities.find((item) => item.id === trip.cityId);
  const start = getLocalStartValues(trip.startDateTime, city?.timezone ?? "Europe/Moscow");
  const error = Array.isArray(query.error) ? query.error[0] : query.error;
  const saved = Array.isArray(query.saved) ? query.saved[0] : query.saved;
  const savedTripSlug = Array.isArray(query.trip) ? query.trip[0] : query.trip;
  const savedChanges = Array.isArray(query.change)
    ? query.change
    : query.change
      ? [query.change]
      : [];
  const requestedReturnTo = Array.isArray(query.returnTo) ? query.returnTo[0] : query.returnTo;
  const returnTo = requestedReturnTo === "/" ? "/" : "/profile";
  const requestedScope = Array.isArray(query.scope) ? query.scope[0] : query.scope;
  const returnScope =
    requestedScope === "feed" || requestedScope === "created" || requestedScope === "participating"
      ? requestedScope
      : returnTo === "/"
        ? "feed"
        : "created";
  const cancelHref = getTripHref(trip);
  const tripId = trip.id;
  const originalTrip: TripDetail = trip;
  const originalLocalStart = `${start.date}T${start.time}`;
  const initialValues: Partial<TripDraft> = {
    cityId: trip.cityId,
    title: trip.title,
    ...start,
    startLocationName: trip.startLocationName,
    startLat: trip.startLat === null ? "" : String(trip.startLat),
    startLng: trip.startLng === null ? "" : String(trip.startLng),
    distanceKm: String(trip.distanceKm),
    averageSpeed: String(trip.paceMax ?? trip.paceMin ?? ""),
    paceMin: String(trip.paceMin ?? ""),
    paceMax: String(trip.paceMax ?? ""),
    difficulty: trip.difficulty,
    asphaltPercent: String(trip.asphaltPercent),
    unpavedPercent: String(trip.unpavedPercent),
    unpavedSurfaceDetails: trip.unpavedSurfaceDetails,
    dropPolicy: trip.dropPolicy,
    hasParticipantLimit: trip.capacity !== null,
    maxParticipants: String(trip.capacity ?? 12),
    registrationMode: trip.registrationMode,
    coverImage: trip.coverImage ?? "",
    description: trip.description,
    routeDescription: trip.routeDescription ?? "",
    routeGpxFileName: trip.routeGpxFileName ?? "",
    routeGpxDownloadUrl: trip.routeGpxDownloadUrl ?? "",
    equipmentRequirements: trip.equipmentRequirements ?? "",
    rules: trip.rules ?? "",
  };

  async function updateTripAction(formData: FormData) {
    "use server";

    let destination = `/trips/${tripReference}/edit?error=${encodeURIComponent("Не удалось сохранить изменения")}`;

    try {
      const input = {
        ...readTripUpdateInput(formData),
        bikeType: originalTrip.bikeType,
      };
      const routeFile = readOptionalFile(formData, "routeGpxFile");
      const coverImageFile = readOptionalFile(formData, "coverImageFile");
      const removeRouteFile = readString(formData, "removeRouteGpx") === "true";
      const changes = getChangedFields(originalTrip, input, formData, originalLocalStart);
      const updatedTrip =
        routeFile || coverImageFile || removeRouteFile
          ? await updateTripWithRouteFile(tripId, input, {
              routeFile,
              coverImageFile,
              removeRouteFile,
            })
          : await updateTrip(tripId, input);
      const updatedTripReference = getTripReference(updatedTrip) ?? tripReference;
      const resultQuery = new URLSearchParams({
        trip: updatedTripReference,
        returnTo,
        saved: "1",
        scope: returnScope,
      });
      changes.forEach((change) => resultQuery.append("change", change));
      destination = `${getTripHref(updatedTrip)}/edit?${resultQuery.toString()}`;
    } catch (actionError) {
      const message =
        actionError instanceof Error ? actionError.message : "Не удалось сохранить изменения";
      destination =
        `/trips/${tripReference}/edit?returnTo=${encodeURIComponent(returnTo)}` +
        `&scope=${encodeURIComponent(returnScope)}` +
        `&error=${encodeURIComponent(message)}`;
    }

    redirect(destination);
  }

  return (
    <>
      <AppTopbar isAuthorized showCreateAction={false} />

      <main className="shell app-content-shell">
        {saved === "1" && savedTripSlug ? (
          <SavedTripConfirmation
            changes={savedChanges}
            returnPath={returnTo}
            returnScope={returnScope}
            tripSlug={savedTripSlug}
          />
        ) : null}
        {!canEdit ? (
          <Alert title="Редактирование недоступно" tone="warning">
            Прошедшую, завершённую или отменённую поездку изменить нельзя.
          </Alert>
        ) : (
          <>
            <Alert title="Участники увидят изменения" tone="warning">
              После сохранения участники опубликованной поездки получат уведомление.
            </Alert>
            {error ? (
              <Alert title="Не удалось сохранить поездку" tone="danger">
                {error}
              </Alert>
            ) : null}
            <TripCreationWizard
              action={updateTripAction}
              canPublish
              cancelHref={cancelHref}
              cities={cities}
              initialValues={initialValues}
              isRegistered
              mode="edit"
              persistDraft={false}
            />
          </>
        )}
      </main>
    </>
  );
}
