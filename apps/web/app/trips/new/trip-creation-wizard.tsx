"use client";

import type { BikeType, DifficultyLevel, SurfaceType } from "@biketrips/domain";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  bikeTypeLabels,
  difficultyLabels,
  surfaceLabels,
} from "../../lib/labels";
import {
  Button,
  Card,
  Chip,
  Dialog,
  FileField,
  FormField,
  LinkButton,
  Stepper,
  Switch,
  TextareaField,
  TextField,
  TripCard,
} from "../../ui/components";
import { StartLocationPicker } from "./start-location-picker";

const DRAFT_KEY = "biketrips:new-trip-draft:v2";
const LEGACY_DRAFT_KEY = "biketrips:new-trip-draft:v1";
const coverTemplates = [
  { src: "/img/Photo1.jpg", label: "Велосипедисты на лесной дороге" },
  { src: "/img/Photo2.jpg", label: "Группа в загородной поездке" },
  { src: "/img/Photo3.jpg", label: "Велосипедный маршрут" },
  { src: "/img/Photo4.jpg", label: "Совместная велопрогулка" },
];
const suggestedTitleByBikeType: Record<BikeType, string> = {
  city: "Городская поездка",
  road: "Шоссейная поездка",
  gravel: "Гравийная поездка",
  mtb: "MTB-поездка",
  hybrid: "Велопоездка",
  any: "Велопоездка",
};

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
  hasParticipantLimit: false,
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

    const saved =
      window.localStorage.getItem(DRAFT_KEY) ??
      window.localStorage.getItem(LEGACY_DRAFT_KEY);
    if (saved) {
      try {
        const savedDraft = JSON.parse(saved) as Partial<TripDraft>;
        setDraft({
          ...initialDraft,
          ...savedDraft,
          hasParticipantLimit: window.localStorage.getItem(DRAFT_KEY)
            ? savedDraft.hasParticipantLimit ?? initialDraft.hasParticipantLimit
            : initialDraft.hasParticipantLimit,
        });
        setRestored(true);
      } catch {
        window.localStorage.removeItem(DRAFT_KEY);
        window.localStorage.removeItem(LEGACY_DRAFT_KEY);
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
    const titlePrefix =
      suggestedTitleByBikeType[draft.bikeType as BikeType] ?? suggestedTitleByBikeType.any;
    const distance = draft.distanceKm ? ` · ${draft.distanceKm} км` : "";
    return `${titlePrefix}${distance}`;
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
        <Stepper
          steps={[
            { id: "1", label: "Когда и где" },
            { id: "2", label: "Условия" },
            { id: "3", label: "Публикация" },
          ]}
          currentStep={String(step)}
          saveStatus={restored ? "saved" : "idle"}
          onStepChange={(stepId) => setStep(Number(stepId))}
        />

        <Card className="wizard-panel" padding="large">
          {step === 1 ? (
            <>
              <div className="wizard-heading">
                <p className="eyebrow">Шаг 1 из 3</p>
                <h1>Когда и где встречаемся?</h1>
                <p>Начните с главного — участники сразу поймут, подходит ли им поездка.</p>
              </div>
              <div className="form-grid">
                <FormField
                  className="span-2"
                  label="Название"
                  hint={!draft.title ? "Мы предложили название — его можно изменить" : undefined}
                  required
                >
                  <TextField
                    name="title"
                    minLength={4}
                    required
                    value={title}
                    onChange={(event) => update("title", event.target.value)}
                  />
                </FormField>
                <FormField label="Дата" required>
                  <TextField
                    type="date"
                    required
                    value={draft.date}
                    onChange={(event) => update("date", event.target.value)}
                  />
                </FormField>
                <FormField label="Время старта" required>
                  <TextField
                    type="time"
                    required
                    value={draft.time}
                    onChange={(event) => update("time", event.target.value)}
                  />
                </FormField>
                <FormField
                  className="span-2"
                  label="Место старта"
                  hint="Адрес обновится после выбора точки на карте"
                  required
                >
                  <TextField
                    name="startLocationName"
                    required
                    readOnly
                    placeholder="Выберите точку на карте"
                    value={draft.startLocationName}
                  />
                </FormField>
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
                <FormField label="Дистанция, км" required>
                  <TextField
                    name="distanceKm"
                    type="number"
                    min="1"
                    step="0.1"
                    required
                    value={draft.distanceKm}
                    onChange={(event) => update("distanceKm", event.target.value)}
                  />
                </FormField>
                <FormField label="Средняя скорость, км/ч" required>
                  <TextField
                    type="number"
                    min="1"
                    required
                    value={draft.averageSpeed}
                    onChange={(event) => updateAverageSpeed(event.target.value)}
                  />
                </FormField>
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
                  <Switch
                    label="Лимит мест"
                    checked={draft.hasParticipantLimit}
                    onChange={(checked) => update("hasParticipantLimit", checked)}
                  />
                  {draft.hasParticipantLimit ? (
                    <FormField className="condition-field" label="Количество мест" required>
                      <TextField
                        name="maxParticipants"
                        type="number"
                        min="1"
                        max="500"
                        required
                        value={draft.maxParticipants}
                        onChange={(event) => update("maxParticipants", event.target.value)}
                      />
                    </FormField>
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
                <FileField
                  inputRef={coverFileRef}
                  name="coverImageFile"
                  accept="image/jpeg,image/png,image/webp"
                  selected={Boolean(customCoverUrl)}
                  label={customCoverName || "Загрузить свою"}
                  hint={customCoverUrl ? "Своя обложка выбрана" : "JPEG, PNG или WebP"}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setCustomCoverUrl(URL.createObjectURL(file));
                    setCustomCoverName(file.name);
                  }}
                />
              </fieldset>
              <FormField label="Краткое описание" required>
                <TextareaField
                  name="description"
                  required
                  minLength={20}
                  rows={5}
                  placeholder="Куда едем, какие будут остановки и чего ожидать участникам"
                  value={draft.description}
                  onChange={(event) => update("description", event.target.value)}
                />
              </FormField>
              <Button
                className="details-toggle"
                tone="ghost"
                type="button"
                aria-expanded={showDetails}
                onClick={() => setShowDetails((current) => !current)}
              >
                <span>Дополнительные детали</span>
                <span>{showDetails ? "−" : "+"}</span>
              </Button>
              {showDetails ? (
                <div className="form-grid optional-fields">
                  <FormField className="span-2" label="Маршрут">
                    <TextareaField
                      name="routeDescription"
                      rows={3}
                      value={draft.routeDescription}
                      onChange={(event) => update("routeDescription", event.target.value)}
                    />
                  </FormField>
                  <FormField label="Снаряжение">
                    <TextareaField
                      name="equipmentRequirements"
                      rows={3}
                      value={draft.equipmentRequirements}
                      onChange={(event) => update("equipmentRequirements", event.target.value)}
                    />
                  </FormField>
                  <FormField label="Правила группы">
                    <TextareaField
                      name="rules"
                      rows={3}
                      value={draft.rules}
                      onChange={(event) => update("rules", event.target.value)}
                    />
                  </FormField>
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
              <Button
                key="next-step"
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  goNext();
                }}
              >
                Продолжить
              </Button>
            ) : (
              <Button key="publish-trip" type="submit">Опубликовать поездку</Button>
            )}
          </div>
        </Card>
      </div>

      <aside className="wizard-preview" aria-label="Предпросмотр поездки">
        <p className="preview-label">Так увидят участники</p>
        <TripCard
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
      <Dialog
        open={showAuth}
        title="Подтвердите профиль"
        description="Войдите через Telegram, чтобы опубликовать поездку и управлять участниками. Заполненные данные уже сохранены."
        onClose={() => setShowAuth(false)}
      >
        <LinkButton className="auth-button" href="/auth/telegram?returnTo=/trips/new">
          Продолжить через Telegram
        </LinkButton>
      </Dialog>
    </form>
  );
}
