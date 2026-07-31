"use client";

import type { City, DifficultyLevel, UnpavedSurfaceDetail } from "@biketrips/domain";
import { useEffect, useMemo, useRef, useState } from "react";

import { savePostAuthReturnTo } from "../../auth/post-auth-return";
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
  type StepperSaveStatus,
} from "../../ui/components";
import type { AuthProvider } from "../../ui/auth-options";
import { AuthOptionsDialog } from "../../ui/auth-options-dialog";
import componentStyles from "../../ui/components.module.css";
import { getMapTilerApiKey } from "../../maps/map-config";
import { GpxRouteMapLoader } from "../../maps/gpx-route-map-loader";
import { StartLocationPicker } from "./start-location-picker";
import { NEW_TRIP_DRAFT_KEY } from "./draft-storage";
import styles from "./trip-creation-wizard.module.css";

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

const coverTemplates = [
  { src: "/img/trip-cover-forest-road.webp", label: "Велосипедисты на лесной дороге" },
  { src: "/img/trip-cover-group-ride.webp", label: "Группа в загородной поездке" },
  { src: "/img/trip-cover-route.webp", label: "Велосипедный маршрут" },
  { src: "/img/trip-cover-social-ride.webp", label: "Совместная велопрогулка" },
];
const defaultCoverImage = coverTemplates[1]!.src;
const maxRouteGpxBytes = 1_000_000;

export interface TripDraft {
  cityId: string;
  title: string;
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
  routeGpxFileName: string;
  routeGpxDownloadUrl: string;
  equipmentRequirements: string;
  rules: string;
}

const initialDraft: TripDraft = {
  cityId: "",
  title: "",
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
  routeGpxFileName: "",
  routeGpxDownloadUrl: "",
  equipmentRequirements: "",
  rules: "",
};

function getPersistableDraft(draft: TripDraft): TripDraft {
  return {
    ...draft,
    routeGpxFileName: "",
    routeGpxDownloadUrl: "",
  };
}

function getDisplayCoverImage(coverImage: string): string {
  return coverImage.startsWith("/trips/") && coverImage.includes("/cover-image")
    ? `/api${coverImage}`
    : coverImage;
}

interface TripCreationWizardProps {
  action: (formData: FormData) => void | Promise<void>;
  canPublish: boolean;
  mode?: "create" | "edit";
  cancelHref?: string;
  isRegistered?: boolean;
  initialStep?: 1 | 2 | 3;
  initialValues?: Partial<TripDraft>;
  persistDraft?: boolean;
  cities: City[];
}

export function TripCreationWizard({
  action,
  canPublish,
  mode = "create",
  cancelHref = "/",
  isRegistered = false,
  initialStep = 1,
  initialValues,
  persistDraft = true,
  cities,
}: TripCreationWizardProps) {
  const defaultDraft = useMemo(() => ({ ...initialDraft, ...initialValues }), [initialValues]);
  const [step, setStep] = useState<number>(initialStep);
  const [draft, setDraft] = useState<TripDraft>(() => defaultDraft);
  const [saveStatus, setSaveStatus] = useState<StepperSaveStatus>("idle");
  const [showDetails, setShowDetails] = useState(
    Boolean(
      initialValues?.routeDescription ||
      initialValues?.routeGpxFileName ||
      initialValues?.equipmentRequirements ||
      initialValues?.rules,
    ),
  );
  const [stepError, setStepError] = useState("");
  const [showAuth, setShowAuth] = useState(false);
  const [customCoverUrl, setCustomCoverUrl] = useState("");
  const [customCoverName, setCustomCoverName] = useState("");
  const [isTitleEdited, setIsTitleEdited] = useState(Boolean(defaultDraft.title));
  const [routeGpxError, setRouteGpxError] = useState("");
  const [showRouteMap, setShowRouteMap] = useState(false);
  const [routeGpxPreviewContent, setRouteGpxPreviewContent] = useState("");
  const [removeRouteGpx, setRemoveRouteGpx] = useState(false);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const routeGpxFileRef = useRef<HTMLInputElement>(null);
  const initialPersistSkippedRef = useRef(false);
  const restoredDraftPendingRef = useRef(false);

  useEffect(() => {
    if (!persistDraft) return;

    const saved = window.localStorage.getItem(NEW_TRIP_DRAFT_KEY);
    if (saved) {
      try {
        const savedDraft = JSON.parse(saved) as Partial<TripDraft>;
        setDraft({
          ...defaultDraft,
          ...savedDraft,
          hasParticipantLimit: savedDraft.hasParticipantLimit ?? defaultDraft.hasParticipantLimit,
          routeGpxFileName: defaultDraft.routeGpxFileName,
          routeGpxDownloadUrl: defaultDraft.routeGpxDownloadUrl,
        });
        restoredDraftPendingRef.current = true;
      } catch {
        window.localStorage.removeItem(NEW_TRIP_DRAFT_KEY);
      }
    }
  }, [defaultDraft, persistDraft]);

  useEffect(() => {
    if (!persistDraft) return;

    if (!initialPersistSkippedRef.current) {
      initialPersistSkippedRef.current = true;
      return;
    }

    if (restoredDraftPendingRef.current) {
      restoredDraftPendingRef.current = false;
      return;
    }

    setSaveStatus("saving");
    const timeout = window.setTimeout(() => {
      try {
        window.localStorage.setItem(NEW_TRIP_DRAFT_KEY, JSON.stringify(getPersistableDraft(draft)));
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [draft, persistDraft]);

  useEffect(
    () => () => {
      if (customCoverUrl) URL.revokeObjectURL(customCoverUrl);
    },
    [customCoverUrl]
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
      unpavedSurfaceDetails: asphaltPercent === 100 ? [] : current.unpavedSurfaceDetails,
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

  async function updateRouteGpx(file: File | undefined) {
    setRouteGpxError("");
    setShowRouteMap(false);
    setRouteGpxPreviewContent("");

    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".gpx")) {
      setRouteGpxError("Загрузите файл с расширением .gpx.");
      if (routeGpxFileRef.current) routeGpxFileRef.current.value = "";
      return;
    }
    if (file.size > maxRouteGpxBytes) {
      setRouteGpxError("GPX-файл должен быть не больше 1 МБ.");
      if (routeGpxFileRef.current) routeGpxFileRef.current.value = "";
      return;
    }

    const content = await file.text();
    if (!/<gpx[\s>]/i.test(content)) {
      setRouteGpxError("Не удалось найти GPX-разметку в файле.");
      if (routeGpxFileRef.current) routeGpxFileRef.current.value = "";
      return;
    }

    setDraft((current) => ({
      ...current,
      routeGpxFileName: file.name,
    }));
    setRouteGpxPreviewContent(content);
    setRemoveRouteGpx(false);
    setShowRouteMap(true);
  }

  function clearRouteGpx() {
    const shouldRemoveSavedFile = Boolean(draft.routeGpxDownloadUrl);
    setDraft((current) => ({
      ...current,
      routeGpxFileName: "",
      routeGpxDownloadUrl: "",
    }));
    setRouteGpxPreviewContent("");
    setRemoveRouteGpx(shouldRemoveSavedFile);
    setRouteGpxError("");
    setShowRouteMap(false);
    if (routeGpxFileRef.current) routeGpxFileRef.current.value = "";
  }

  function validateStep(currentStep: number): boolean {
    const effectiveTitle = draft.title || (isTitleEdited ? "" : suggestedTitle);

    if (
      currentStep === 1 &&
      (!effectiveTitle.trim() ||
        !draft.date ||
        !draft.time ||
        !draft.startLocationName ||
        !draft.startLat ||
        !draft.startLng ||
        !draft.distanceKm ||
        !draft.averageSpeed)
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
    const returnTo = mode === "edit" ? cancelHref : "/trips/new?step=3";
    if (mode === "create") savePostAuthReturnTo(returnTo);
    window.location.assign(`/auth/${provider}?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const title = draft.title || (isTitleEdited ? "" : suggestedTitle);
  const startAt = draft.date && draft.time ? `${draft.date}T${draft.time}` : "";
  const selectedCover = customCoverUrl || draft.coverImage || defaultCoverImage;
  const previewCover = customCoverUrl || getDisplayCoverImage(draft.coverImage || defaultCoverImage);
  const selectedCity = cities.find((city) => city.id === draft.cityId) ?? cities[0];
  const mapTilerApiKey = getMapTilerApiKey();

  return (
    <form
      action={action}
      className={styles.layout}
      onSubmit={(event) => {
        if (!canPublish) {
          event.preventDefault();
          if (isRegistered) {
            window.location.assign("/profile?verifyPhone=1");
          } else {
            setShowAuth(true);
          }
          return;
        }
      }}
    >
      <input name="organizerId" type="hidden" value="30000000-0000-4000-8000-000000000001" />
      <input name="cityId" type="hidden" value={draft.cityId} />
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
      <input
        name="hasParticipantLimit"
        type="hidden"
        value={String(draft.hasParticipantLimit)}
      />
      {draft.hasParticipantLimit ? (
        <input name="maxParticipants" type="hidden" value={draft.maxParticipants} />
      ) : null}
      <input name="registrationMode" type="hidden" value={draft.registrationMode} />
      <input name="coverImage" type="hidden" value={customCoverUrl ? "" : selectedCover} />
      <input name="removeRouteGpx" type="hidden" value={String(removeRouteGpx)} />

      <div className={styles.main}>
        <Stepper
          steps={[
            { id: "1", label: "Когда и где" },
            { id: "2", label: "Условия" },
            { id: "3", label: "Публикация" },
          ]}
          currentStep={String(step)}
          saveStatus={saveStatus}
          onStepChange={(stepId) => setStep(Number(stepId))}
        />

        <Card className={styles.panel} padding="large">
          {step === 1 ? (
            <>
              <div className={styles.heading}>
                <p className={styles.eyebrow}>{mode === "edit" ? "Редактирование · шаг 1 из 3" : "Шаг 1 из 3"}</p>
                <h1>Когда и где встречаемся?</h1>
                <p>Начните с главного — участники сразу поймут, подходит ли им поездка.</p>
              </div>
              <div className={styles.formGrid}>
                <FormField className={styles.span2} label="Город" required>
                  <select
                    className={componentStyles.input}
                    required
                    value={draft.cityId}
                    onChange={(event) => update("cityId", event.target.value)}
                  >
                    {cities.map((city) => (
                      <option value={city.id} key={city.id}>{city.name}</option>
                    ))}
                  </select>
                </FormField>
                <FormField
                  className={styles.span2}
                  label="Название"
                  hint={!draft.title ? "Мы предложили название — его можно изменить" : undefined}
                  required
                >
                  <TextField
                    name="title"
                    minLength={4}
                    required
                    value={title}
                    onChange={(event) => {
                      setIsTitleEdited(true);
                      update("title", event.target.value);
                    }}
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
                <div className={styles.span2}>
                  <StartLocationPicker
                    cityCenter={
                      selectedCity?.centerLat != null && selectedCity?.centerLng != null
                        ? { lat: selectedCity.centerLat, lng: selectedCity.centerLng }
                        : undefined
                    }
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
              <div className={styles.heading}>
                <p className={styles.eyebrow}>{mode === "edit" ? "Редактирование · шаг 2 из 3" : "Шаг 2 из 3"}</p>
                <h1>Кому подойдёт поездка?</h1>
                <p>Темп и покрытие помогут собрать совместимую группу.</p>
              </div>
              <div className={`${styles.formGrid} ${styles.conditionsForm}`}>
                <input name="bikeType" type="hidden" value="any" />
                <div className={styles.conditionField}>
                  <span>Сложность маршрута</span>
                  <DifficultySelect
                    name="difficulty"
                    value={draft.difficulty as DifficultyLevel}
                    onChange={(value) => update("difficulty", value)}
                  />
                </div>
                <div className={`${styles.conditionField} ${styles.surfaceConditionField}`}>
                  <span>Покрытие</span>
                  <div className={styles.surfaceComposition}>
                    <div className={styles.surfaceFields}>
                      <FormField label="Грунт">
                        <div className={styles.surfacePercentField}>
                          <TextField
                            className={styles.surfaceInput}
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
                        <div className={styles.surfacePercentField}>
                          <TextField
                            className={styles.surfaceInput}
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
                    <div className={styles.surfaceRangeWrap}>
                      <span className={styles.surfaceRangeTrack} aria-hidden="true">
                        <span style={{ width: `${draft.asphaltPercent}%` }} />
                      </span>
                      <input
                        className={styles.surfaceRange}
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
                    <div className={styles.unpavedDetails}>
                      <span>
                        Что встретится на грунтовой части? <small>Необязательно</small>
                      </span>
                      <div
                        className={styles.conditionChips}
                        role="group"
                        aria-label="Уточнение грунтовой части"
                      >
                        {(
                          Object.entries(unpavedSurfaceDetailLabels) as Array<
                            [UnpavedSurfaceDetail, string]
                          >
                        ).map(([value, label]) => (
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
                <div className={styles.participantLimitField}>
                  <Switch
                    label="Лимит мест"
                    checked={draft.hasParticipantLimit}
                    onChange={(checked) => update("hasParticipantLimit", checked)}
                  />
                  {draft.hasParticipantLimit ? (
                    <FormField className={styles.conditionField} label="Количество мест" required>
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
              <div className={styles.heading}>
                <p className={styles.eyebrow}>{mode === "edit" ? "Редактирование · шаг 3 из 3" : "Шаг 3 из 3"}</p>
                <h1>Расскажите о поездке</h1>
                <p>
                  Короткого описания достаточно. Остальные детали можно добавить сейчас или позже.
                </p>
              </div>
              <fieldset className={styles.coverPicker}>
                <legend>Обложка поездки</legend>
                <div className={styles.coverTemplates}>
                  {coverTemplates.map((cover) => (
                    <button
                      className={classes(
                        selectedCover === cover.src && !customCoverUrl && styles.coverSelected,
                      )}
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
              <div className={styles.routeGpxField}>
                <FileField
                  inputRef={routeGpxFileRef}
                  name="routeGpxFile"
                  accept=".gpx,application/gpx+xml,application/xml,text/xml"
                  selected={Boolean(draft.routeGpxFileName)}
                  label={draft.routeGpxFileName || "Загрузить GPX-маршрут"}
                  hint={draft.routeGpxFileName ? "Файл маршрута выбран" : "Необязательно, до 1 МБ"}
                  onChange={(event) => void updateRouteGpx(event.target.files?.[0])}
                />
                {draft.routeGpxFileName ? (
                  <div className={styles.routeGpxActions}>
                    {routeGpxPreviewContent ? (
                      <Button tone="secondary" type="button" onClick={() => setShowRouteMap((open) => !open)}>
                        {showRouteMap ? "Скрыть карту" : "Открыть карту"}
                      </Button>
                    ) : null}
                    <Button tone="ghost" type="button" onClick={clearRouteGpx}>
                      Удалить GPX
                    </Button>
                  </div>
                ) : null}
                {routeGpxError ? (
                  <p className={styles.routeGpxError} role="alert">{routeGpxError}</p>
                ) : null}
                {showRouteMap && routeGpxPreviewContent ? (
                  mapTilerApiKey ? (
                    <div className={styles.routeGpxMap}>
                      <GpxRouteMapLoader
                        apiKey={mapTilerApiKey}
                        fileName={draft.routeGpxFileName}
                        gpxContent={routeGpxPreviewContent}
                      />
                    </div>
                  ) : (
                    <p className={styles.routeGpxError}>
                      Карта недоступна: не задан ключ MapTiler.
                    </p>
                  )
                ) : null}
              </div>
              <Button
                className={styles.detailsToggle}
                tone="ghost"
                type="button"
                aria-expanded={showDetails}
                onClick={() => setShowDetails((current) => !current)}
              >
                <span className={styles.detailsToggleLabel}>
                  <span>Дополнительные детали</span>
                  <span>{showDetails ? "−" : "+"}</span>
                </span>
              </Button>
              {showDetails ? (
                <div className={`${styles.formGrid} ${styles.optionalFields}`}>
                  <FormField className={styles.span2} label="Маршрут">
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
                  <input
                    name="equipmentRequirements"
                    type="hidden"
                    value={draft.equipmentRequirements}
                  />
                  <input name="rules" type="hidden" value={draft.rules} />
                </>
              )}
            </>
          ) : null}

          {stepError ? (
            <div className={styles.inlineError} role="alert">
              {stepError}
            </div>
          ) : null}

          <div className={styles.actions}>
            {step > 1 ? (
              <Button className={styles.actionButton} tone="secondary" type="button" onClick={goBack}>
                Назад
              </Button>
            ) : (
              <LinkButton className={styles.actionButton} href={cancelHref} tone="secondary">
                Отмена
              </LinkButton>
            )}
            {step < 3 ? (
              <Button
                className={styles.actionButton}
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
              <Button className={styles.actionButton} key="submit-trip" type="submit">
                {mode === "edit" ? "Сохранить изменения" : "Опубликовать поездку"}
              </Button>
            )}
          </div>
        </Card>
      </div>

      <aside className={styles.preview} aria-label="Предпросмотр поездки">
        <p className={styles.previewLabel}>
          {mode === "edit" ? "Так поездка будет выглядеть" : "Так поездку увидят участники"}
        </p>
        <TripCard
          title={title}
          date={draft.date}
          time={draft.time}
          startLocationName={draft.startLocationName}
          distanceKm={draft.distanceKm}
          difficulty={draft.difficulty as DifficultyLevel}
          averageSpeed={draft.averageSpeed}
          maxParticipants={draft.hasParticipantLimit ? draft.maxParticipants : undefined}
          coverImage={previewCover}
        />
      </aside>
      {showAuth ? <AuthOptionsDialog onClose={() => setShowAuth(false)} onSelect={startAuthorization} /> : null}
    </form>
  );
}
