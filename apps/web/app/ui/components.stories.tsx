"use client";

import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { BikeType, DifficultyLevel, SurfaceType } from "@biketrips/domain";

import { demoTrips } from "../lib/demo-data";
import { bikeTypeLabels, difficultyLabels, surfaceLabels } from "../lib/labels";
import {
  Alert,
  Button,
  CapacityIndicator,
  Card,
  Chip,
  DifficultyBadge,
  EmptyState,
  FormField,
  IconButton,
  LinkButton,
  ParticipantRow,
  ParticipationStatusBadge,
  RouteFilterBar,
  SelectField,
  Skeleton,
  StickyActionBar,
  TextareaField,
  TextField,
  TripMeta,
  TripStatusBadge,
} from "./components";

import type { RouteFilterValue } from "./components";

const meta = {
  title: "Design System/Components/MVP Kit",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Actions: Story = {
  render: () => (
    <StorySection title="Кнопки и ссылки">
      <div className="story-row">
        <Button>Записаться</Button>
        <Button tone="secondary">Подробнее</Button>
        <Button tone="ghost">Отмена</Button>
        <Button tone="danger">Отменить поездку</Button>
        <Button loading>Публикуем</Button>
        <Button disabled>Недоступно</Button>
        <LinkButton href="/trips/new">Создать поездку</LinkButton>
        <IconButton label="Поделиться">↗</IconButton>
        <IconButton label="Добавить" tone="dark">+</IconButton>
      </div>
    </StorySection>
  ),
};

export const BadgesAndChips: Story = {
  render: () => (
    <StorySection title="Статусы, метки и фильтры">
      <div className="story-column">
        <div className="story-row">
          <TripStatusBadge status="draft" />
          <TripStatusBadge status="published" />
          <TripStatusBadge status="cancelled" />
          <TripStatusBadge status="finished" />
        </div>
        <div className="story-row">
          <ParticipationStatusBadge status="pending" />
          <ParticipationStatusBadge status="confirmed" />
          <ParticipationStatusBadge status="waitlisted" />
          <ParticipationStatusBadge status="cancelled" />
        </div>
        <div className="story-chip-group">
          <strong>Сложность маршрута</strong>
          <div className="story-row">
            <DifficultyBadge difficulty="easy" />
            <DifficultyBadge difficulty="medium" />
            <DifficultyBadge difficulty="hard" />
          </div>
        </div>
        <ChipDemo />
      </div>
    </StorySection>
  ),
};

export const FormControls: Story = {
  render: () => (
    <StorySection title="Поля формы">
      <div className="story-form-grid">
        <FormField label="Название" hint="Коротко опишите характер поездки" required>
          <TextField defaultValue="Вечерний gravel по паркам" />
        </FormField>
        <FormField label="Сложность маршрута">
          <SelectField defaultValue="medium">
            <option value="easy">Легкий</option>
            <option value="medium">Средний</option>
            <option value="hard">Сложный</option>
          </SelectField>
        </FormField>
        <FormField label="Место старта" error="Укажите место встречи" required>
          <TextField placeholder="Парк, станция или адрес" aria-invalid="true" />
        </FormField>
        <FormField label="Описание" hint="Расскажите о маршруте и остановках">
          <TextareaField rows={4} defaultValue="Спокойный маршрут через парки и набережные." />
        </FormField>
      </div>
    </StorySection>
  ),
};

export const Feedback: Story = {
  render: () => (
    <StorySection title="Обратная связь и состояния">
      <div className="story-column">
        <Alert title="Вы записаны" tone="success">Подтверждение отправлено в Telegram.</Alert>
        <Alert title="Осталось одно место" tone="warning">После заполнения откроется лист ожидания.</Alert>
        <Alert title="Не удалось сохранить" tone="danger">Проверьте соединение и попробуйте снова.</Alert>
        <Card>
          <div className="story-column">
            <Skeleton width="42%" height={24} />
            <Skeleton width="100%" />
            <Skeleton width="76%" />
          </div>
        </Card>
        <EmptyState
          title="Поездок пока нет"
          action={<Button tone="secondary">Сбросить фильтры</Button>}
        >
          Измените фильтры или создайте первую поездку в своём городе.
        </EmptyState>
      </div>
    </StorySection>
  ),
};

export const TripInformation: Story = {
  render: () => (
    <StorySection title="Данные поездки">
      <div className="story-column">
        <TripMeta trip={demoTrips[0]!} />
        <CapacityIndicator capacity={14} confirmed={8} />
        <CapacityIndicator capacity={18} confirmed={18} />
      </div>
    </StorySection>
  ),
};

export const Participants: Story = {
  render: () => (
    <StorySection title="Участники">
      <Card padding="none">
        {demoTrips[0]!.participants.map((participant) => (
          <ParticipantRow
            key={participant.id}
            participant={participant}
            actions={<Button tone="ghost" size="small">•••</Button>}
          />
        ))}
        <ParticipantRow
          participant={{
            id: "participant-3",
            userId: "user-3",
            name: "Никита Орлов",
            telegramUsername: null,
            phone: null,
            status: "waitlisted",
          }}
        />
      </Card>
    </StorySection>
  ),
};

export const RouteFilters: Story = {
  render: () => <RouteFilterDemo />,
};

export const MobileActionBar: Story = {
  globals: {
    viewport: { value: "mobile1", isRotated: false },
  },
  render: () => (
    <div style={{ minHeight: 520 }}>
      <StorySection title="Мобильная панель действий">
        <p>Панель закрепляется у нижней границы экрана и сохраняет главное действие доступным.</p>
      </StorySection>
      <StickyActionBar
        summary={<><strong>6 мест</strong><span>из 14 свободно</span></>}
        secondaryAction={<Button tone="ghost">Поделиться</Button>}
        primaryAction={<Button>Записаться</Button>}
      />
    </div>
  ),
};

function StorySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="story-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function ChipDemo() {
  const [selected, setSelected] = useState<BikeType>("gravel");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");
  const [surfaces, setSurfaces] = useState<SurfaceType[]>(["mixed"]);
  const bikeOptions = Object.entries(bikeTypeLabels) as Array<[BikeType, string]>;
  const difficultyOptions = Object.entries(difficultyLabels) as Array<[DifficultyLevel, string]>;
  const surfaceOptions = Object.entries(surfaceLabels) as Array<[SurfaceType, string]>;

  function toggleSurface(value: SurfaceType) {
    if (value === "mixed") {
      setSurfaces(["mixed"]);
      return;
    }

    const concreteTypes = (Object.keys(surfaceLabels) as SurfaceType[]).filter(
      (surface) => surface !== "mixed",
    );
    const selectedConcrete = surfaces.filter((surface) => surface !== "mixed");
    const next = selectedConcrete.includes(value)
      ? selectedConcrete.filter((surface) => surface !== value)
      : [...selectedConcrete, value];

    if (next.length === 0) {
      setSurfaces(["mixed"]);
      return;
    }

    const allSelected = next.length === concreteTypes.length;
    setSurfaces(allSelected ? [...next, "mixed"] : next);
  }

  return (
    <div className="story-column">
      <div className="story-chip-group">
        <strong>Велосипед</strong>
        <div className="story-row">
          {bikeOptions.map(([value, label]) => (
            <Chip key={value} selected={selected === value} onClick={() => setSelected(value)}>
              {label}
            </Chip>
          ))}
        </div>
      </div>
      <div className="story-chip-group">
        <strong>Сложность маршрута</strong>
        <div className="story-row">
          {difficultyOptions.map(([value, label]) => (
            <Chip
              key={value}
              selected={difficulty === value}
              onClick={() => setDifficulty(value)}
            >
              {label}
            </Chip>
          ))}
        </div>
      </div>
      <div className="story-chip-group">
        <strong>Покрытие</strong>
        <div className="story-row">
          {surfaceOptions.map(([value, label]) => (
            <Chip
              key={value}
              selected={surfaces.includes(value)}
              onClick={() => toggleSurface(value)}
            >
              {label}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}

function RouteFilterDemo() {
  const [filters, setFilters] = useState<RouteFilterValue>({
    measure: "distance",
    distanceFromKm: 0,
    distanceToKm: 200,
    durationFromHours: 0,
    durationToHours: 12,
    difficulty: ["easy", "medium", "hard"],
    surface: ["asphalt", "gravel", "unpaved", "offroad"],
  });

  return (
    <StorySection title="Фильтры маршрутов">
      <RouteFilterBar value={filters} onChange={setFilters} />
    </StorySection>
  );
}
