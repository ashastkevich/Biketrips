import Link from "next/link";
import { redirect } from "next/navigation";

import { createTrip, getOrganizerAuthState } from "../../lib/api";
import { AppTopbar, PageHeader } from "../../lib/components";
import { readTripInput } from "../../lib/form-data";
import {
  bikeTypeLabels,
  difficultyLabels,
  dropPolicyLabels,
  registrationModeLabels,
  surfaceLabels,
} from "../../lib/labels";

async function createTripAction(formData: FormData) {
  "use server";

  let destination = "/trips/new?error=Не удалось создать поездку";

  try {
    const trip = await createTrip(readTripInput(formData));
    destination = `/organizer/trips/${trip.id}?created=1`;
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

  return (
    <main className="shell">
      <AppTopbar />
      <Link className="back-link" href="/">
        На главную
      </Link>
      <PageHeader eyebrow="Организатор" title="Новая поездка">
        <p>Заполните основные параметры, сохраните черновик и опубликуйте его из кабинета.</p>
      </PageHeader>

      {getOrganizerAuthState() === "missing" ? (
        <div className="notice" role="status">
          Для отправки в API нужен серверный `BIKETRIPS_ORGANIZER_TOKEN`; форма и валидация уже
          готовы.
        </div>
      ) : null}
      {error ? (
        <div className="notice danger" role="alert">
          {error}
        </div>
      ) : null}

      <form action={createTripAction} className="panel form wide-form">
        <input name="organizerId" type="hidden" value="demo-organizer-1" />
        <input name="cityId" type="hidden" value="demo-city-moscow" />

        <div className="form-grid">
          <label className="span-2">
            <span>Название</span>
            <input name="title" required minLength={4} placeholder="Вечерний gravel по паркам" />
          </label>
          <label>
            <span>Старт</span>
            <input name="startAt" type="datetime-local" required />
          </label>
          <label>
            <span>Место старта</span>
            <input name="startLocationName" required placeholder="Парк Победы, главный вход" />
          </label>
          <label>
            <span>Дистанция, км</span>
            <input name="distanceKm" type="number" min={1} step="0.1" required defaultValue={40} />
          </label>
          <label>
            <span>Лимит мест</span>
            <input name="maxParticipants" type="number" min={1} max={500} required defaultValue={12} />
          </label>
          <label>
            <span>Темп от, км/ч</span>
            <input name="paceMin" type="number" min={1} defaultValue={18} />
          </label>
          <label>
            <span>Темп до, км/ч</span>
            <input name="paceMax" type="number" min={1} defaultValue={24} />
          </label>
          <label>
            <span>Уровень</span>
            <select name="difficulty" required defaultValue="medium">
              {Object.entries(difficultyLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Велосипед</span>
            <select name="bikeType" required defaultValue="gravel">
              {Object.entries(bikeTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Покрытие</span>
            <select name="surfaceType" required defaultValue="mixed">
              {Object.entries(surfaceLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Формат</span>
            <select name="dropPolicy" required defaultValue="no_drop">
              {Object.entries(dropPolicyLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Запись</span>
            <select name="registrationMode" required defaultValue="automatic">
              {Object.entries(registrationModeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Широта</span>
            <input name="startLat" type="number" step="0.000001" />
          </label>
          <label>
            <span>Долгота</span>
            <input name="startLng" type="number" step="0.000001" />
          </label>
          <label className="span-2">
            <span>Описание</span>
            <textarea name="description" required rows={5} />
          </label>
          <label className="span-2">
            <span>Маршрут</span>
            <textarea name="routeDescription" rows={4} />
          </label>
          <label className="span-2">
            <span>Снаряжение</span>
            <textarea name="equipmentRequirements" rows={3} />
          </label>
          <label className="span-2">
            <span>Правила</span>
            <textarea name="rules" rows={3} />
          </label>
        </div>
        <div className="form-actions">
          <Link className="button secondary" href="/">
            Отмена
          </Link>
          <button className="button" type="submit">
            Создать черновик
          </button>
        </div>
      </form>
    </main>
  );
}
