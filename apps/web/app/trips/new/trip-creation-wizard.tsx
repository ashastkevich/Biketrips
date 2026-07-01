"use client";

import type { BikeType, DifficultyLevel, SurfaceType } from "@biketrips/domain";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  bikeTypeLabels,
  difficultyLabels,
  surfaceLabels,
} from "../../lib/labels";
import { Button, Chip, DifficultyBadge, LinkButton } from "../../ui/components";
import { StartLocationPicker } from "./start-location-picker";

const DRAFT_KEY = "biketrips:new-trip-draft:v1";
const coverTemplates = [
  { src: "/img/Photo1.jpg", label: "Велосипедисты на лесной дороге" },
  { src: "/img/Photo2.jpg", label: "Группа в загородной поездке" },
  { src: "/img/Photo3.jpg", label: "Велосипедный маршрут" },
  { src: "/img/Photo4.jpg", label: "Совместная велопрогулка" },
];

export interface TripDraft {
  title: string;
  city: string;
  date: string;
  time: string;
  startLocationName: string;
  startLat: string;
  startLng: string;
  distanceKm: string;
  averageSpeed: string;
  paceMin: string;
  paceMax: string;
  difficulty: string;
  bikeType: string;
  bikeTypes: BikeType[];
  surfaceType: string;
  surfaceTypes: SurfaceType[];
  dropPolicy: string;
  hasParticipantLimit: boolean;
  maxParticipants: string;
  registrationMode: string;
  coverImage: string;
  description: string;
  routeDescription: string;
  equipmentRequirements: string;
  rules: string;
}

const initialDraft: TripDraft = {
  title: "",
  city: "Москва",
  date: "",
  time: "10:00",
  startLocationName: "",
  startLat: "",
  startLng: "",
  distanceKm: "40",
  averageSpeed: "21",
  paceMin: "18",
  paceMax: "24",
  difficulty: "medium",
  bikeType: "any",
  bikeTypes: ["any"],
  surfaceType: "mixed",
  surfaceTypes: ["mixed"],
  dropPolicy: "no_drop",
  hasParticipantLimit: true,
  maxParticipants: "12",
  registrationMode: "automatic",
  coverImage: "/img/Photo2.jpg",
  description: "",
  routeDescription: "",
  equipmentRequirements: "",
  rules: "",
};

interface TripCreationWizardProps {
  action: (formData: FormData) => void | Promise<void>;
  canPublish: boolean;
  initialStep?: 1 | 2 | 3;
  initialValues?: Partial<TripDraft>;
  persistDraft?: boolean;
}

interface TripPreviewCardProps {
  title: string;
  date: string;
  time: string;
  startLocationName: string;
  distanceKm: string | number;
  difficulty: DifficultyLevel;
  averageSpeed: string | number;
  maxParticipants?: string | number;
  coverImage: string;
}

export function TripPreviewCard({
  title,
  date,
  time,
  startLocationName,
  distanceKm,
  difficulty,
  averageSpeed,
  maxParticipants,
  coverImage,
}: TripPreviewCardProps) {
  return (
    <article className="preview-card">
      <div
        className="preview-cover"
        style={{
          backgroundImage: `linear-gradient(180deg, transparent, rgba(5, 18, 11, 0.52)), url("${coverImage}")`,
        }}
      >
        <span>{distanceKm || "—"} км</span>
      </div>
      <div className="preview-body">
        <p className="preview-date">
          {date || "Выберите дату"} · {time || "—:—"}
        </p>
        <h2>{title}</h2>
        <p>{startLocationName || "Укажите место старта"}</p>
        <div className="preview-tags">
          <DifficultyBadge difficulty={difficulty} />
          <span>{averageSpeed || "—"} км/ч</span>
          {maxParticipants ? <span>{maxParticipants} мест</span> : null}
        </div>
      </div>
    </article>
  );
}

export function TripCreationWizard({
  action,
  canPublish,
  initialStep = 1,
  initialValues,
  persistDraft = true,
}: TripCreationWizardProps) {
  const [step, setStep] = useState<number>(initialStep);
  const [draft, setDraft] = useState<TripDraft>(() => ({ ...initialDraft, ...initialValues }));
  const [restored, setRestored] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [stepError, setStepError] = useState("");
  const [showAuth, setShowAuth] = useState(false);
  const [customCoverUrl, setCustomCoverUrl] = useState("");
  const [customCoverName, setCustomCoverName] = useState("");
  const coverFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!persistDraft) return;

    const saved = window.localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        setDraft({ ...initialDraft, ...(JSON.parse(saved) as Partial<TripDraft>) });
        setRestored(true);
      } catch {
        window.localStorage.removeItem(DRAFT_KEY);
      }
    }
  }, [persistDraft]);

  useEffect(() => {
    if (!persistDraft) return;

    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [draft, persistDraft]);

  useEffect(
    () => () => {
      if (customCoverUrl) URL.revokeObjectURL(customCoverUrl);
    },
    [customCoverUrl],
  );

  const suggestedTitle = useMemo(() => {
    const bike = bikeTypeLabels[draft.bikeType as keyof typeof bikeTypeLabels] ?? "велосипедная";
    const distance = draft.distanceKm ? ` · ${draft.distanceKm} км` : "";
    return `${bike} поездка${distance}`;
  }, [draft.bikeType, draft.distanceKm]);

  function update<K extends keyof TripDraft>(key: K, value: TripDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setStepError("");
  }

  function updateAverageSpeed(value: string) {
    setDraft((current) => ({
      ...current,
      averageSpeed: value,
      paceMin: value,
      paceMax: value,
    }));
    setStepError("");
  }

  function toggleBikeType(value: BikeType) {
    setDraft((current) => {
      if (value === "any") {
        return { ...current, bikeType: "any", bikeTypes: ["any"] };
      }

      const concreteTypes = (Object.keys(bikeTypeLabels) as BikeType[]).filter(
        (type) => type !== "any",
      );
      const selectedConcreteTypes = current.bikeTypes.filter((type) => type !== "any");
      const nextConcreteTypes = selectedConcreteTypes.includes(value)
        ? selectedConcreteTypes.filter((type) => type !== value)
        : [...selectedConcreteTypes, value];

      if (nextConcreteTypes.length === 0) {
        return { ...current, bikeType: "any", bikeTypes: ["any"] };
      }

      const allTypesSelected = nextConcreteTypes.length === concreteTypes.length;
      return {
        ...current,
        bikeType: nextConcreteTypes.length === 1 ? nextConcreteTypes[0]! : "any",
        bikeTypes: allTypesSelected ? [...nextConcreteTypes, "any"] : nextConcreteTypes,
      };
    });
    setStepError("");
  }

  function toggleSurfaceType(value: SurfaceType) {
    setDraft((current) => {
      if (value === "mixed") {
        return { ...current, surfaceType: "mixed", surfaceTypes: ["mixed"] };
      }

      const concreteTypes = (Object.keys(surfaceLabels) as SurfaceType[]).filter(
        (type) => type !== "mixed",
      );
      const selectedConcreteTypes = current.surfaceTypes.filter((type) => type !== "mixed");
      const nextConcreteTypes = selectedConcreteTypes.includes(value)
        ? selectedConcreteTypes.filter((type) => type !== value)
        : [...selectedConcreteTypes, value];

      if (nextConcreteTypes.length === 0) {
        return { ...current, surfaceType: "mixed", surfaceTypes: ["mixed"] };
      }

      const allTypesSelected = nextConcreteTypes.length === concreteTypes.length;
      return {
        ...current,
        surfaceType: nextConcreteTypes.length === 1 ? nextConcreteTypes[0]! : "mixed",
        surfaceTypes: allTypesSelected ? [...nextConcreteTypes, "mixed"] : nextConcreteTypes,
      };
    });
    setStepError("");
  }

  function validateStep(currentStep: number): boolean {
    if (
      currentStep === 1 &&
      (!draft.date || !draft.time || !draft.startLocationName || !draft.distanceKm || !draft.averageSpeed)
    ) {
      setStepError("Заполните название, дату, время, место старта, дистанцию и среднюю скорость.");
      return false;
    }

    if (currentStep === 1 && Number(draft.averageSpeed) <= 0) {
      setStepError("Средняя скорость должна быть больше нуля.");
      return false;
    }

    return true;
  }

  function goNext() {
    if (!validateStep(step)) return;
    setStep((current) => Math.min(3, current + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    setStep((current) => Math.max(1, current - 1));
    setStepError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const title = draft.title || suggestedTitle;
  const startAt = draft.date && draft.time ? `${draft.date}T${draft.time}` : "";
  const selectedCover = customCoverUrl || draft.coverImage;

  return (
    <form
      action={action}
      className="wizard-layout"
      onSubmit={(event) => {
        if (!canPublish) {
          event.preventDefault();
          setShowAuth(true);
        }
      }}
    >
      <input name="organizerId" type="hidden" value="demo-organizer-1" />
      <input name="cityId" type="hidden" value="demo-city-moscow" />
      <input name="startAt" type="hidden" value={startAt} />
      <input name="startLat" type="hidden" value={draft.startLat} />
      <input name="startLng" type="hidden" value={draft.startLng} />
      <input name="paceMin" type="hidden" value={draft.paceMin} />
      <input name="paceMax" type="hidden" value={draft.paceMax} />
      <input name="dropPolicy" type="hidden" value={draft.dropPolicy} />
      <input name="coverImage" type="hidden" value={customCoverUrl ? "" : draft.coverImage} />

      <div className="wizard-main">
        <ol className="wizard-progress" aria-label="Шаги создания поездки">
          {["Когда и где", "Условия", "Публикация"].map((label, index) => {
            const number = index + 1;
            return (
              <li className={number === step ? "is-current" : number < step ? "is-done" : ""} key={label}>
                <button type="button" onClick={() => number < step && setStep(number)}>
                  <span>{number < step ? "✓" : number}</span>
                  {label}
                </button>
              </li>
            );
          })}
        </ol>

        {restored ? (
          <div className="draft-status" role="status">
            Восстановили ваш незавершённый черновик
          </div>
        ) : (
          <div className="draft-status">Черновик сохраняется автоматически</div>
        )}

        <section className="panel wizard-panel">
          {step === 1 ? (
            <>
              <div className="wizard-heading">
                <p className="eyebrow">Шаг 1 из 3</p>
                <h1>Когда и где встречаемся?</h1>
                <p>Начните с главного — участники сразу поймут, подходит ли им поездка.</p>
              </div>
              <div className="form-grid">
                <label className="span-2">
                  <span>Название</span>
                  <input
                    name="title"
                    minLength={4}
                    required
                    value={title}
                    onChange={(event) => update("title", event.target.value)}
                  />
                  {!draft.title ? (
                    <small className="field-hint">Мы предложили название — его можно изменить</small>
                  ) : null}
                </label>
                <label>
                  <span>Дата</span>
                  <input
                    type="date"
                    required
                    value={draft.date}
                    onChange={(event) => update("date", event.target.value)}
                  />
                </label>
                <label>
                  <span>Время старта</span>
                  <input
                    type="time"
                    required
                    value={draft.time}
                    onChange={(event) => update("time", event.target.value)}
                  />
                </label>
                <label className="span-2">
                  <span>Место старта</span>
                  <input
                    name="startLocationName"
                    required
                    readOnly
                    placeholder="Выберите точку на карте"
                    value={draft.startLocationName}
                  />
                  <small className="field-hint">Адрес обновится после выбора точки на карте</small>
                </label>
                <div className="span-2">
                  <StartLocationPicker
                    city={draft.city}
                    value={{
                      name: draft.startLocationName,
                      lat: draft.startLat,
                      lng: draft.startLng,
                    }}
                    onChange={(location) => {
                      update("startLocationName", location.name);
                      update("startLat", location.lat);
                      update("startLng", location.lng);
                    }}
                  />
                </div>
                <label>
                  <span>Дистанция, км</span>
                  <input
                    name="distanceKm"
                    type="number"
                    min="1"
                    step="0.1"
                    required
                    value={draft.distanceKm}
                    onChange={(event) => update("distanceKm", event.target.value)}
                  />
                </label>
                <label>
                  <span>Средняя скорость, км/ч</span>
                  <input
                    type="number"
                    min="1"
                    required
                    value={draft.averageSpeed}
                    onChange={(event) => updateAverageSpeed(event.target.value)}
                  />
                </label>
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <div className="wizard-heading">
                <p className="eyebrow">Шаг 2 из 3</p>
                <h1>Кому подойдёт поездка?</h1>
                <p>Темп и покрытие помогут собрать совместимую группу.</p>
              </div>
              <div className="form-grid conditions-form">
                <div className="condition-field">
                  <span>Сложность маршрута</span>
                  <div className="condition-chips" role="group" aria-label="Сложность маршрута">
                    {(Object.entries(difficultyLabels) as Array<[DifficultyLevel, string]>).map(
                      ([value, label]) => (
                        <Chip
                          key={value}
                          selected={draft.difficulty === value}
                          onClick={() => update("difficulty", value)}
                        >
                          {label}
                        </Chip>
                      ),
                    )}
                  </div>
                  <input name="difficulty" type="hidden" value={draft.difficulty} />
                </div>
                <div className="condition-field">
                  <span>Велосипед</span>
                  <div className="condition-chips" role="group" aria-label="Подходящие велосипеды">
                    {(Object.entries(bikeTypeLabels) as Array<[BikeType, string]>).map(
                      ([value, label]) => (
                        <Chip
                          key={value}
                          selected={draft.bikeTypes.includes(value)}
                          onClick={() => toggleBikeType(value)}
                        >
                          {label}
                        </Chip>
                      ),
                    )}
                  </div>
                  <input name="bikeType" type="hidden" value={draft.bikeType} />
                </div>
                <div className="condition-field">
                  <span>Покрытие</span>
                  <div className="condition-chips" role="group" aria-label="Покрытие маршрута">
                    {(Object.entries(surfaceLabels) as Array<[SurfaceType, string]>).map(
                      ([value, label]) => (
                        <Chip
                          key={value}
                          selected={draft.surfaceTypes.includes(value)}
                          onClick={() => toggleSurfaceType(value)}
                        >
                          {label}
                        </Chip>
                      ),
                    )}
                  </div>
                  <input name="surfaceType" type="hidden" value={draft.surfaceType} />
                </div>
                <div className="participant-limit-field">
                  <label className="switch-control">
                    <span className="switch-control__copy">Лимит мест</span>
                    <input
                      type="checkbox"
                      role="switch"
                      checked={draft.hasParticipantLimit}
                      onChange={(event) => update("hasParticipantLimit", event.target.checked)}
                    />
                    <span className="switch-control__track" aria-hidden="true" />
                  </label>
                  {draft.hasParticipantLimit ? (
                    <label className="condition-field">
                      <span>Количество мест</span>
                      <input
                        name="maxParticipants"
                        type="number"
                        min="1"
                        max="500"
                        required
                        value={draft.maxParticipants}
                        onChange={(event) => update("maxParticipants", event.target.value)}
                      />
                    </label>
                  ) : (
                    <input name="maxParticipants" type="hidden" value="500" />
                  )}
                </div>
                <input name="registrationMode" type="hidden" value={draft.registrationMode} />
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <div className="wizard-heading">
                <p className="eyebrow">Шаг 3 из 3</p>
                <h1>Расскажите о поездке</h1>
                <p>Короткого описания достаточно. Остальные детали можно добавить сейчас или позже.</p>
              </div>
              <fieldset className="cover-picker">
                <legend>Обложка поездки</legend>
                <div className="cover-templates">
                  {coverTemplates.map((cover) => (
                    <button
                      className={draft.coverImage === cover.src && !customCoverUrl ? "is-selected" : ""}
                      type="button"
                      key={cover.src}
                      aria-label={cover.label}
                      aria-pressed={draft.coverImage === cover.src && !customCoverUrl}
                      style={{ backgroundImage: `url("${cover.src}")` }}
                      onClick={() => {
                        setCustomCoverUrl("");
                        setCustomCoverName("");
                        update("coverImage", cover.src);
                        if (coverFileRef.current) coverFileRef.current.value = "";
                      }}
                    >
                      <span aria-hidden="true">✓</span>
                    </button>
                  ))}
                </div>
                <label className={`cover-upload${customCoverUrl ? " is-selected" : ""}`}>
                  <input
                    ref={coverFileRef}
                    name="coverImageFile"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      setCustomCoverUrl(URL.createObjectURL(file));
                      setCustomCoverName(file.name);
                    }}
                  />
                  <span>{customCoverName || "Загрузить свою"}</span>
                  <small>{customCoverUrl ? "Своя обложка выбрана" : "JPEG, PNG или WebP"}</small>
                </label>
              </fieldset>
              <label>
                <span>Краткое описание</span>
                <textarea
                  name="description"
                  required
                  minLength={20}
                  rows={5}
                  placeholder="Куда едем, какие будут остановки и чего ожидать участникам"
                  value={draft.description}
                  onChange={(event) => update("description", event.target.value)}
                />
              </label>
              <button
                className="details-toggle"
                type="button"
                aria-expanded={showDetails}
                onClick={() => setShowDetails((current) => !current)}
              >
                <span>Дополнительные детали</span>
                <span>{showDetails ? "−" : "+"}</span>
              </button>
              {showDetails ? (
                <div className="form-grid optional-fields">
                  <label className="span-2">
                    <span>Маршрут</span>
                    <textarea
                      name="routeDescription"
                      rows={3}
                      value={draft.routeDescription}
                      onChange={(event) => update("routeDescription", event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Снаряжение</span>
                    <textarea
                      name="equipmentRequirements"
                      rows={3}
                      value={draft.equipmentRequirements}
                      onChange={(event) => update("equipmentRequirements", event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Правила группы</span>
                    <textarea
                      name="rules"
                      rows={3}
                      value={draft.rules}
                      onChange={(event) => update("rules", event.target.value)}
                    />
                  </label>
                </div>
              ) : (
                <>
                  <input name="routeDescription" type="hidden" value={draft.routeDescription} />
                  <input name="equipmentRequirements" type="hidden" value={draft.equipmentRequirements} />
                  <input name="rules" type="hidden" value={draft.rules} />
                </>
              )}
            </>
          ) : null}

          {stepError ? <div className="inline-error" role="alert">{stepError}</div> : null}

          <div className="wizard-actions">
            {step > 1 ? (
              <Button tone="secondary" type="button" onClick={goBack}>Назад</Button>
            ) : (
              <LinkButton href="/" tone="secondary">Отмена</LinkButton>
            )}
            {step < 3 ? (
              <Button type="button" onClick={goNext}>Продолжить</Button>
            ) : (
              <Button type="submit">Опубликовать поездку</Button>
            )}
          </div>
        </section>
      </div>

      <aside className="wizard-preview" aria-label="Предпросмотр поездки">
        <p className="preview-label">Так увидят участники</p>
        <TripPreviewCard
          title={title}
          date={draft.date}
          time={draft.time}
          startLocationName={draft.startLocationName}
          distanceKm={draft.distanceKm}
          difficulty={draft.difficulty as DifficultyLevel}
          averageSpeed={draft.averageSpeed}
          maxParticipants={draft.hasParticipantLimit ? draft.maxParticipants : undefined}
          coverImage={selectedCover}
        />
      </aside>
      {showAuth ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowAuth(false)}>
          <div
            className="create-modal auth-prompt"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-prompt-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close" type="button" aria-label="Закрыть" onClick={() => setShowAuth(false)}>
              ×
            </button>
            <p className="eyebrow">Один короткий шаг</p>
            <h2 id="auth-prompt-title">Подтвердите профиль</h2>
            <p className="modal-copy">
              Войдите через Telegram, чтобы опубликовать поездку и управлять участниками.
              Заполненные данные уже сохранены.
            </p>
            <LinkButton className="auth-button" href="/auth/telegram?returnTo=/trips/new">
              Продолжить через Telegram
            </LinkButton>
          </div>
        </div>
      ) : null}
    </form>
  );
}
