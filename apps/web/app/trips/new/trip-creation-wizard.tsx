"use client";

import type {
  DifficultyLevel,
  UnpavedSurfaceDetail,
} from "@biketrips/domain";
import { useEffect, useMemo, useRef, useState } from "react";

import { unpavedSurfaceDetailLabels } from "../../lib/labels";
import {
  Button,
  Card,
  Chip,
  DifficultySelect,
  FileField,
  FormField,
  LinkButton,
  Stepper,
  Switch,
  TextareaField,
  TextField,
  TripCard,
} from "../../ui/components";
import { AuthOptions, type AuthProvider } from "../../ui/auth-options";
import { StartLocationPicker } from "./start-location-picker";

const DRAFT_KEY = "biketrips:new-trip-draft:v5";
const coverTemplates = [
  { src: "/img/Photo1.jpg", label: "Велосипедисты на лесной дороге" },
  { src: "/img/Photo2.jpg", label: "Группа в загородной поездке" },
  { src: "/img/Photo3.jpg", label: "Велосипедный маршрут" },
  { src: "/img/Photo4.jpg", label: "Совместная велопрогулка" },
];
const defaultCoverImage = coverTemplates[1]!.src;
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
  asphaltPercent: string;
  unpavedPercent: string;
  unpavedSurfaceDetails: UnpavedSurfaceDetail[];
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
  asphaltPercent: "100",
  unpavedPercent: "0",
  unpavedSurfaceDetails: [],
  dropPolicy: "no_drop",
  hasParticipantLimit: false,
  maxParticipants: "12",
  registrationMode: "automatic",
  coverImage: defaultCoverImage,
  description: "",
  routeDescription: "",
  equipmentRequirements: "",
  rules: "",
};

interface TripCreationWizardProps {
  action: (formData: FormData) => void | Promise<void>;
  canPublish: boolean;
  isRegistered?: boolean;
  initialStep?: 1 | 2 | 3;
  initialValues?: Partial<TripDraft>;
  persistDraft?: boolean;
}

export function TripCreationWizard({
  action,
  canPublish,
  isRegistered = false,
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
        const savedDraft = JSON.parse(saved) as Partial<TripDraft>;
        setDraft({
          ...initialDraft,
          ...savedDraft,
          hasParticipantLimit:
            savedDraft.hasParticipantLimit ?? initialDraft.hasParticipantLimit,
        });
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
    const distance = draft.distanceKm ? ` · ${draft.distanceKm} км` : "";
    return `Велопоездка${distance}`;
  }, [draft.distanceKm]);

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

  function updateAsphaltPercent(rawValue: string) {
    const asphaltPercent = Math.min(100, Math.max(0, Number(rawValue) || 0));
    setDraft((current) => ({
      ...current,
      asphaltPercent: String(asphaltPercent),
      unpavedPercent: String(100 - asphaltPercent),
      unpavedSurfaceDetails:
        asphaltPercent === 100 ? [] : current.unpavedSurfaceDetails,
    }));
    setStepError("");
  }

  function toggleUnpavedSurfaceDetail(value: UnpavedSurfaceDetail) {
    setDraft((current) => ({
      ...current,
      unpavedSurfaceDetails: current.unpavedSurfaceDetails.includes(value)
        ? current.unpavedSurfaceDetails.filter((detail) => detail !== value)
        : [...current.unpavedSurfaceDetails, value],
    }));
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

  function startAuthorization(provider: AuthProvider) {
    window.location.assign(`/auth/${provider}?returnTo=/trips/new`);
  }

  const title = draft.title || suggestedTitle;
  const startAt = draft.date && draft.time ? `${draft.date}T${draft.time}` : "";
  const selectedCover = customCoverUrl || draft.coverImage || defaultCoverImage;

  return (
    <form
      action={action}
      className="wizard-layout"
      onSubmit={(event) => {
        if (!canPublish) {
          event.preventDefault();
          if (isRegistered) {
            window.location.assign("/profile?verifyPhone=1");
          } else {
            setShowAuth(true);
          }
        }
      }}
    >
      <input name="organizerId" type="hidden" value="30000000-0000-4000-8000-000000000001" />
      <input name="cityId" type="hidden" value="10000000-0000-4000-8000-000000000001" />
      <input name="title" type="hidden" value={title} />
      <input name="startAt" type="hidden" value={startAt} />
      <input name="startLocationName" type="hidden" value={draft.startLocationName} />
      <input name="startLat" type="hidden" value={draft.startLat} />
      <input name="startLng" type="hidden" value={draft.startLng} />
      <input name="distanceKm" type="hidden" value={draft.distanceKm} />
      <input name="paceMin" type="hidden" value={draft.paceMin} />
      <input name="paceMax" type="hidden" value={draft.paceMax} />
      <input name="difficulty" type="hidden" value={draft.difficulty} />
      <input name="bikeType" type="hidden" value="any" />
      <input name="asphaltPercent" type="hidden" value={draft.asphaltPercent} />
      <input name="unpavedPercent" type="hidden" value={draft.unpavedPercent} />
      {draft.unpavedSurfaceDetails.map((detail) => (
        <input name="unpavedSurfaceDetails" type="hidden" value={detail} key={detail} />
      ))}
      <input name="dropPolicy" type="hidden" value={draft.dropPolicy} />
      {draft.hasParticipantLimit ? (
        <input name="maxParticipants" type="hidden" value={draft.maxParticipants} />
      ) : null}
      <input name="registrationMode" type="hidden" value={draft.registrationMode} />
      <input name="coverImage" type="hidden" value={customCoverUrl ? "" : selectedCover} />

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
                <input name="bikeType" type="hidden" value="any" />
                <div className="condition-field">
                  <span>Сложность маршрута</span>
                  <DifficultySelect
                    name="difficulty"
                    value={draft.difficulty as DifficultyLevel}
                    onChange={(value) => update("difficulty", value)}
                  />
                </div>
                <div className="condition-field surface-condition-field">
                  <span>Покрытие</span>
                  <div className="surface-composition">
                    <div className="surface-composition__fields">
                      <FormField label="Грунт">
                        <div className="surface-percent-field">
                          <TextField
                            name="unpavedPercent"
                            type="number"
                            min="0"
                            max="100"
                            value={draft.unpavedPercent}
                            onChange={(event) =>
                              updateAsphaltPercent(String(100 - Number(event.target.value)))
                            }
                          />
                          <span>%</span>
                        </div>
                      </FormField>
                      <FormField label="Асфальт">
                        <div className="surface-percent-field">
                          <TextField
                            name="asphaltPercent"
                            type="number"
                            min="0"
                            max="100"
                            value={draft.asphaltPercent}
                            onChange={(event) => updateAsphaltPercent(event.target.value)}
                          />
                          <span>%</span>
                        </div>
                      </FormField>
                    </div>
                    <div className="surface-composition__range-wrap">
                      <span className="surface-composition__range-track" aria-hidden="true">
                        <span style={{ width: `${draft.asphaltPercent}%` }} />
                      </span>
                      <input
                        className="surface-composition__range"
                        type="range"
                        min="0"
                        max="100"
                        step="10"
                        aria-label="Доля асфальта на маршруте"
                        aria-valuetext={`${draft.asphaltPercent}% асфальта, ${draft.unpavedPercent}% грунта`}
                        value={draft.asphaltPercent}
                        onChange={(event) => updateAsphaltPercent(event.target.value)}
                      />
                    </div>
                  </div>
                  {Number(draft.unpavedPercent) > 0 ? (
                    <div className="unpaved-details">
                      <span>Что встретится на грунтовой части? <small>Необязательно</small></span>
                      <div className="condition-chips" role="group" aria-label="Уточнение грунтовой части">
                        {(Object.entries(unpavedSurfaceDetailLabels) as Array<
                          [UnpavedSurfaceDetail, string]
                        >).map(([value, label]) => (
                          <Chip
                            key={value}
                            selected={draft.unpavedSurfaceDetails.includes(value)}
                            onClick={() => toggleUnpavedSurfaceDetail(value)}
                          >
                            {label}
                          </Chip>
                        ))}
                      </div>
                      {draft.unpavedSurfaceDetails.map((detail) => (
                        <input
                          name="unpavedSurfaceDetails"
                          type="hidden"
                          value={detail}
                          key={detail}
                        />
                      ))}
                    </div>
                  ) : null}
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
                  ) : null}
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
                      className={selectedCover === cover.src && !customCoverUrl ? "is-selected" : ""}
                      type="button"
                      key={cover.src}
                      aria-label={cover.label}
                      aria-pressed={selectedCover === cover.src && !customCoverUrl}
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
      {showAuth ? (
        <div
          className="ui-dialog-backdrop auth-options-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-options-title"
          onMouseDown={() => setShowAuth(false)}
        >
          <div onMouseDown={(event) => event.stopPropagation()}>
            <AuthOptions
              onClose={() => setShowAuth(false)}
              onSelect={startAuthorization}
            />
          </div>
        </div>
      ) : null}
    </form>
  );
}
