import Link from "next/link";
import { redirect } from "next/navigation";

import { createTrip, getOrganizerAuthState, updateTripStatus } from "../../lib/api";
import { AppTopbar } from "../../lib/components";
import { readTripInput } from "../../lib/form-data";
import { TripCreationWizard } from "./trip-creation-wizard";

async function createTripAction(formData: FormData) {
  "use server";

  let destination = "/trips/new?error=Не удалось создать поездку";

  try {
    const trip = await createTrip(readTripInput(formData));
    await updateTripStatus(trip.id, "publish");
    destination = `/organizer/trips/${trip.id}?published=1`;
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
  const query = await searchParams;
  const error = Array.isArray(query.error) ? query.error[0] : query.error;
  const canPublish = getOrganizerAuthState() === "configured";

  return (
    <main className="shell">
      <AppTopbar />
      <Link className="back-link" href="/">
        На главную
      </Link>
      {!canPublish ? (
        <div className="notice" role="status">
          Форму можно заполнить без входа. Для публикации потребуется подтверждённый профиль
          организатора.
        </div>
      ) : null}
      {error ? (
        <div className="notice danger" role="alert">
          {error}
        </div>
      ) : null}

      <TripCreationWizard action={createTripAction} canPublish={canPublish} />
    </main>
  );
}
