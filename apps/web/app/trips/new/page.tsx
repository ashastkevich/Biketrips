import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import {
  createTrip,
  createTripWithRouteFile,
  getCities,
  getOrganizerAuthState,
  updateTripStatus,
} from "../../lib/api";
import { CITY_COOKIE_NAME, fallbackCities, selectCity } from "../../lib/cities";
import { AppTopbar } from "../../lib/components";
import { readOptionalFile, readTripInput } from "../../lib/form-data";
import { Alert } from "../../ui/components";
import { TripCreationWizard } from "./trip-creation-wizard";

async function createTripAction(formData: FormData) {
  "use server";

  let destination = "/trips/new?error=Не удалось создать поездку";

  try {
    const input = readTripInput(formData);
    const routeFile = readOptionalFile(formData, "routeGpxFile");
    const coverImageFile = readOptionalFile(formData, "coverImageFile");
    const trip = routeFile || coverImageFile
      ? await createTripWithRouteFile(input, routeFile, coverImageFile)
      : await createTrip(input);
    await updateTripStatus(trip.id, "publish");
    destination = "/#rides";
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось создать поездку";
    destination = `/trips/new?error=${encodeURIComponent(message)}`;
  }

  redirect(destination);
}

interface NewTripPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function NewTripPage({ searchParams }: NewTripPageProps) {
  const [query, cookieStore, citiesResult, authState] = await Promise.all([
    searchParams,
    cookies(),
    getCities(),
    getOrganizerAuthState(),
  ]);
  const error = Array.isArray(query.error) ? query.error[0] : query.error;
  const requestedCity = Array.isArray(query.city) ? query.city[0] : query.city;
  const cities = citiesResult.data.length > 0 ? citiesResult.data : fallbackCities;
  const selectedCity = selectCity(
    cities,
    requestedCity ?? cookieStore.get(CITY_COOKIE_NAME)?.value,
  );
  const canPublish = authState === "allowed";

  return (
    <main className="shell">
      <AppTopbar showCreateAction={false} />
      {!canPublish ? (
        <Alert
          title={authState === "phone-required" ? "Добавьте номер телефона" : "Публикация после входа"}
          tone="warning"
        >
          {authState === "phone-required"
            ? "Создавать поездки могут зарегистрированные пользователи с заполненным номером телефона."
            : "Форму можно заполнить без входа. Для публикации потребуется регистрация и номер телефона в профиле."}
        </Alert>
      ) : null}
      {error ? (
        <Alert title="Не удалось создать поездку" tone="danger">{error}</Alert>
      ) : null}

      <TripCreationWizard
        action={createTripAction}
        canPublish={canPublish}
        cities={cities}
        initialValues={{ cityId: selectedCity.id }}
        isRegistered={authState !== "missing"}
      />
    </main>
  );
}
