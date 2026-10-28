import type { TripDetail } from "@biketrips/domain";
import { describe, expect, it } from "vitest";

import { storyTrips } from "../ui/story-fixtures";
import { defaultSocialImage } from "./site";
import { getHomeJsonLd, getOrganizerJsonLd, getTripJsonLd, serializeJsonLd } from "./structured-data";

const trip: TripDetail = { ...storyTrips[0]!, startLat: 55.7316, startLng: 37.5065 };
const image = { url: "/api/trips/trip-1/cover-image?v=1&format=jpeg", alt: trip.title };

describe("getTripJsonLd", () => {
  it("describes a trip as an offline event at its start place", () => {
    const [event, breadcrumbs] = getTripJsonLd(trip, { description: "Вечерняя поездка", image });

    expect(event).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Event",
      name: "Вечерний gravel по паркам",
      description: "Вечерняя поездка",
      url: "https://biketrips.ru/trips/moscow-evening-gravel",
      image: ["https://biketrips.ru/api/trips/trip-1/cover-image?v=1&format=jpeg"],
      startDate: "2026-07-04T18:30:00+03:00",
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      location: {
        "@type": "Place",
        name: "Парк Победы, главный вход",
        address: { "@type": "PostalAddress", addressLocality: "Москва", addressCountry: "RU" },
        geo: { "@type": "GeoCoordinates", latitude: 55.7316, longitude: 37.5065 },
      },
      organizer: {
        "@type": "Person",
        name: "RideMate Moscow",
        url: "https://biketrips.ru/organizers/demo-organizer-1",
      },
      maximumAttendeeCapacity: 14,
      remainingAttendeeCapacity: 6,
    });
    expect(breadcrumbs).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: [
        { position: 1, name: "BikeTrips", item: "https://biketrips.ru/" },
        { position: 2, name: trip.title, item: "https://biketrips.ru/trips/moscow-evening-gravel" },
      ],
    });
  });

  it("marks cancelled trips and leaves out unknown coordinates and capacity", () => {
    const [event] = getTripJsonLd(
      { ...trip, status: "cancelled", startLat: null, startLng: null, capacity: null },
      { description: "", image: defaultSocialImage },
    );

    expect(event).toMatchObject({
      eventStatus: "https://schema.org/EventCancelled",
      image: ["https://biketrips.ru/img/og-default.jpg"],
    });
    expect(event!.location).not.toHaveProperty("geo");
    expect(event).not.toHaveProperty("maximumAttendeeCapacity");
  });

  it("names the club an imported post credits rather than the channel", () => {
    const [event] = getTripJsonLd(
      {
        ...trip,
        source: "telegram_import",
        organizer: { ...trip.organizer, id: "channel-1", displayName: "Канал", kind: "channel" },
        importedOrganizer: { ...trip.organizer, id: "club-1", displayName: "Велоклуб", kind: "club" },
      },
      { description: "", image },
    );

    expect(event!.organizer).toEqual({
      "@type": "Organization",
      name: "Велоклуб",
      url: "https://biketrips.ru/organizers/club-1",
    });
  });
});

describe("site-wide and organizer markup", () => {
  it("describes the site and its organization", () => {
    expect(getHomeJsonLd().map((item) => item["@type"])).toEqual(["WebSite", "Organization"]);
  });

  it("links an organizer page back to the home page", () => {
    expect(getOrganizerJsonLd({ id: "organizer-1", displayName: "Анна" })[0]).toMatchObject({
      itemListElement: [
        { item: "https://biketrips.ru/" },
        { name: "Анна", item: "https://biketrips.ru/organizers/organizer-1" },
      ],
    });
  });
});

describe("serializeJsonLd", () => {
  it("keeps trip text from closing the script tag", () => {
    const json = serializeJsonLd([{ name: "</script><script>alert(1)</script>" }]);

    expect(json).not.toContain("<");
    expect(JSON.parse(json)).toEqual({ name: "</script><script>alert(1)</script>" });
  });
});
