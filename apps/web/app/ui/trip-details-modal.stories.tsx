"use client";

import { useState } from "react";
import { fn } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { storyTrips } from "./story-fixtures";
import { Button } from "./components";
import { TripDetailsModal } from "./trip-details-modal";
import tripDetailsStyles from "./trip-details.module.css";

const meta = {
  title: "Design System/Patterns/Карточка поездки",
  component: TripDetailsModal,
  parameters: { layout: "fullscreen" },
  args: {
    open: true,
    trip: storyTrips[0]!,
    coverImage: "/img/trip-cover-group-ride.webp",
    currentUserId: undefined,
    onClose: fn(),
    onJoin: fn(),
  },
} satisfies Meta<typeof TripDetailsModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Available: Story = { name: "Есть свободные места" };

export const Unlimited: Story = {
  name: "Без лимита участников",
  args: {
    trip: { ...storyTrips[0]!, capacity: null },
  },
};

export const Imported: Story = {
  name: "Импорт из Telegram",
  args: {
    trip: {
      ...storyTrips[0]!,
      source: "telegram_import",
      sourceUrl: "https://t.me/example_rides/123",
      externalRegistrationUrl: "https://t.me/example_organizer",
      capacity: null,
      organizer: {
        ...storyTrips[0]!.organizer,
        displayName: "Велопокатушки Москва",
        isVerified: false,
        kind: "channel",
        contactUrl: "https://t.me/example_rides",
      },
      importedOrganizer: {
        id: "demo-leader-1",
        userId: "demo-leader-user-1",
        displayName: "Андрей",
        isVerified: false,
        kind: "person",
        contactUrl: null,
      },
    },
  },
};

export const Waitlist: Story = {
  name: "Лист ожидания",
  args: { trip: storyTrips[1]!, coverImage: "/img/trip-cover-route.webp" },
};

export const Interactive: Story = {
  name: "Открытие с карточки",
  render: (args) => <InteractiveDemo {...args} />,
};

function InteractiveDemo(props: React.ComponentProps<typeof TripDetailsModal>) {
  const [open, setOpen] = useState(false);
  return (
    <main className={tripDetailsStyles.story}>
      <div>
        <p>Ближайшая поездка</p>
        <h1>{props.trip.title}</h1>
        <Button size="large" onClick={() => setOpen(true)}>Посмотреть поездку</Button>
      </div>
      <TripDetailsModal {...props} open={open} onClose={() => setOpen(false)} />
    </main>
  );
}
