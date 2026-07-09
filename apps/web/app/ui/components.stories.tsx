"use client";

import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { City, DifficultyLevel, UnpavedSurfaceDetail } from "@biketrips/domain";

import { storyTrips } from "./story-fixtures";
import { AppTopbar, getTripCardProps, PageHeader } from "../lib/components";
import { ProfileMenu } from "../home-auth-control";
import { CityFilter } from "../city-selector";
import {
  difficultyLabels,
  unpavedSurfaceDetailLabels,
} from "../lib/labels";
import {
  Alert,
  BackLink,
  Button,
  CapacityIndicator,
  Card,
  Chip,
  CloseButton,
  DifficultyBadge,
  DifficultySelect,
  EmptyState,
  FileField,
  FormField,
  IconButton,
  LinkButton,
  ParticipantRow,
  ParticipationStatusBadge,
  RouteFilterBar,
  SelectField,
  Skeleton,
  StickyActionBar,
  Switch,
  TextareaField,
  TextField,
  TripMeta,
  TripCard as TripCardComponent,
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
        <CloseButton />
        <div style={{ padding: 16, background: "#344125", borderRadius: 16 }}>
          <CloseButton tone="dark" />
        </div>
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
        <SwitchDemo />
        <FileField label="Загрузить обложку" hint="JPEG, PNG или WebP" accept="image/*" />
      </div>
    </StorySection>
  ),
};

export const DifficultyDropdown: Story = {
  name: "Выпадающий список сложности",
  render: () => <DifficultySelectDemo />,
};

export const Navigation: Story = {
  render: () => (
    <StorySection title="Навигация">
      <div className="story-row">
        <BackLink href="/">На главную</BackLink>
        <LinkButton href="/trips/new">Создать поездку</LinkButton>
        <ProfileMenu tone="dark" />
      </div>
    </StorySection>
  ),
};

export const SiteShell: Story = {
  render: () => (
    <div className="story-column">
      <AppTopbar />
      <PageHeader
        eyebrow="Поездки рядом"
        title="Совместные велопоездки"
        actions={<LinkButton href="/trips/new">Создать поездку</LinkButton>}
      >
        <p>Единая шапка, заголовок страницы и карточка результата.</p>
      </PageHeader>
      <TripCardComponent {...getTripCardProps(storyTrips[0]!)} />
    </div>
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
        <TripMeta trip={storyTrips[0]!} />
        <CapacityIndicator capacity={14} confirmed={8} />
        <CapacityIndicator capacity={18} confirmed={18} />
      </div>
    </StorySection>
  ),
};

export const TripCard: Story = {
  name: "TripCard",
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <TripCardComponent
        title="Гравийный круг через Мещеру"
        date="18.07.2026"
        time="09:30"
        startLocationName="МЦД Крюково, главный вход"
        distanceKm={68}
        difficulty="medium"
        averageSpeed={21}
        maxParticipants={12}
        coverImage="/img/Photo2.jpg"
      />
    </div>
  ),
};

export const Participants: Story = {
  render: () => (
    <StorySection title="Участники">
      <Card padding="none">
        {storyTrips[0]!.participants.map((participant) => (
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
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");
  const [surfaces, setSurfaces] = useState<UnpavedSurfaceDetail[]>(["gravel"]);
  const difficultyOptions = Object.entries(difficultyLabels) as Array<[DifficultyLevel, string]>;
  const surfaceOptions = Object.entries(unpavedSurfaceDetailLabels) as Array<
    [UnpavedSurfaceDetail, string]
  >;

  function toggleSurface(value: UnpavedSurfaceDetail) {
    setSurfaces((current) =>
      current.includes(value)
        ? current.filter((surface) => surface !== value)
        : [...current, value],
    );
  }

  return (
    <div className="story-column">
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
        <strong>Уточнение грунтовой части</strong>
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

function DifficultySelectDemo() {
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");

  return (
    <StorySection title="Сложность маршрута">
      <div style={{ width: "min(520px, 100%)" }}>
        <FormField label="Сложность маршрута">
          <DifficultySelect value={difficulty} onChange={setDifficulty} />
        </FormField>
      </div>
    </StorySection>
  );
}

function SwitchDemo() {
  const [checked, setChecked] = useState(true);
  return <Switch label="Лимит мест" checked={checked} onChange={setChecked} />;
}

function RouteFilterDemo() {
  const cities: City[] = [
    { id: "moscow", name: "Москва", slug: "moscow", timezone: "Europe/Moscow", centerLat: 55.7558, centerLng: 37.6173 },
    { id: "saint-petersburg", name: "Санкт-Петербург", slug: "saint-petersburg", timezone: "Europe/Moscow", centerLat: 59.9343, centerLng: 30.3351 },
    { id: "kazan", name: "Казань", slug: "kazan", timezone: "Europe/Moscow", centerLat: 55.7879, centerLng: 49.1233 },
  ];
  const [selectedCity, setSelectedCity] = useState(cities[0]!);
  const [filters, setFilters] = useState<RouteFilterValue>({
    measure: "distance",
    distanceFromKm: 0,
    distanceToKm: 200,
    durationFromHours: 0,
    durationToHours: 12,
    difficulty: ["beginner", "easy", "medium", "hard", "sport"],
    surface: "any",
  });

  return (
    <StorySection title="Фильтры маршрутов">
      <div className="find-trip-filters">
        <CityFilter cities={cities} selectedCity={selectedCity} onChange={setSelectedCity} />
        <RouteFilterBar value={filters} onChange={setFilters} />
      </div>
    </StorySection>
  );
}
