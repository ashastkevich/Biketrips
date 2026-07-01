import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { StartLocationPicker } from "./start-location-picker";
import { TripCreationWizard } from "./trip-creation-wizard";

const meta = {
  title: "Design System/Patterns/Создание поездки",
  component: TripCreationWizard,
  parameters: {
    layout: "padded",
  },
  args: {
    action: () => undefined,
    canPublish: true,
    persistDraft: false,
  },
} satisfies Meta<typeof TripCreationWizard>;

export default meta;
type Story = StoryObj<typeof meta>;

const filledTrip = {
  title: "Гравийный круг через Мещеру",
  city: "Москва",
  date: "2026-07-18",
  time: "09:30",
  startLocationName: "МЦД Крюково, главный вход",
  startLat: "55.982731",
  startLng: "37.173855",
  distanceKm: "68",
  averageSpeed: "21",
  paceMin: "19",
  paceMax: "24",
  difficulty: "medium",
  bikeType: "any",
  bikeTypes: ["any" as const],
  surfaceType: "mixed",
  surfaceTypes: ["mixed" as const],
  dropPolicy: "no_drop",
  hasParticipantLimit: true,
  maxParticipants: "12",
  registrationMode: "automatic",
  coverImage: "/img/Photo2.jpg",
  description:
    "Едем спокойный гравийный круг через лесные дороги и поля, с остановкой на кофе в середине маршрута.",
  routeDescription: "",
  equipmentRequirements: "",
  rules: "",
};

function StartLocationPickerDemo() {
  const [location, setLocation] = useState({
    name: "Парк Победы, главный вход",
    lat: "55.736305",
    lng: "37.518311",
  });

  return (
    <div style={{ maxWidth: 720 }}>
      <label>
        <span>Место старта</span>
        <input readOnly value={location.name} />
      </label>
      <div style={{ marginTop: 12 }}>
        <StartLocationPicker city="Москва" value={location} onChange={setLocation} />
      </div>
    </div>
  );
}

export const StartLocationMap: Story = {
  name: "Компонент / Место старта на карте",
  render: () => <StartLocationPickerDemo />,
};

export const StepOneMeeting: Story = {
  name: "1. Когда и где",
  args: {
    initialStep: 1,
    initialValues: {
      city: "Москва",
      time: "10:00",
      distanceKm: "40",
      averageSpeed: "21",
    },
  },
};

export const StepTwoConditions: Story = {
  name: "2. Условия",
  args: {
    initialStep: 2,
    initialValues: filledTrip,
  },
};

export const StepThreePublication: Story = {
  name: "3. Публикация",
  args: {
    initialStep: 3,
    initialValues: filledTrip,
  },
};
