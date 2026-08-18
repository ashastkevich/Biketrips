import { describe, expect, it } from "vitest";

import {
  readNumber,
  readOptionalFile,
  readOptionalNumber,
  readParticipantInput,
  readParticipantStatus,
  readString,
  readTripInput,
  readTripUpdateInput,
} from "./form-data";

describe("form-data helpers", () => {
  it("reads and trims strings and numbers", () => {
    const formData = new FormData();
    formData.set("name", "  Alex  ");
    formData.set("distance", "42.5");
    formData.set("empty", "");

    expect(readString(formData, "name")).toBe("Alex");
    expect(readNumber(formData, "distance")).toBe(42.5);
    expect(readOptionalNumber(formData, "empty")).toBeUndefined();
  });

  it("throws for invalid required and optional numbers", () => {
    const formData = new FormData();
    formData.set("distance", "far");
    formData.set("pace", "quick");

    expect(() => readNumber(formData, "distance")).toThrow("Поле distance должно быть числом");
    expect(() => readOptionalNumber(formData, "pace")).toThrow("Поле pace должно быть числом");
  });

  it("reads complete trip input from form data", () => {
    const formData = createTripFormData();

    expect(readTripInput(formData)).toEqual({
      title: "Forest route",
      description: "A ride through forest roads",
      startAt: "2099-08-16T08:00:00.000Z",
      startLocationName: "Park",
      startLat: 55.755864,
      startLng: 37.617698,
      distanceKm: 42,
      paceMin: 18,
      paceMax: 22,
      difficulty: "medium",
      bikeType: "gravel",
      asphaltPercent: 70,
      unpavedPercent: 30,
      unpavedSurfaceDetails: ["hardpack", "gravel"],
      dropPolicy: "no_drop",
      routeDescription: "Loop route",
      equipmentRequirements: "Helmet",
      rules: "Ride safely",
      maxParticipants: 10,
      registrationMode: "automatic",
      coverImage: "/cover.webp",
      organizerId: "organizer-1",
      cityId: "city-1",
    });
  });

  it("converts missing participant limits to null for trip updates", () => {
    const formData = createTripFormData();
    formData.set("hasParticipantLimit", "false");

    expect(readTripUpdateInput(formData).maxParticipants).toBeNull();

    formData.set("hasParticipantLimit", "true");
    expect(readTripUpdateInput(formData).maxParticipants).toBe(10);
  });

  it("reads participant input and status", () => {
    const formData = new FormData();
    formData.set("userId", "user-1");
    formData.set("name", " Alex ");
    formData.set("telegramUsername", "alex_rides");
    formData.set("phone", "+7 (999) 000-00-00");
    formData.set("comment", "See you");
    formData.set("status", "confirmed");

    expect(readParticipantInput(formData)).toEqual({
      userId: "user-1",
      name: "Alex",
      telegramUsername: "alex_rides",
      phone: "+7 (999) 000-00-00",
      comment: "See you",
    });
    expect(readParticipantStatus(formData)).toBe("confirmed");
  });

  it("ignores empty file fields", () => {
    const formData = new FormData();
    formData.set("empty", new File([], "empty.gpx"));
    formData.set("route", new File(["<gpx></gpx>"], "route.gpx"));

    expect(readOptionalFile(formData, "empty")).toBeUndefined();
    expect(readOptionalFile(formData, "route")?.name).toBe("route.gpx");
  });
});

function createTripFormData(): FormData {
  const formData = new FormData();
  formData.set("title", "Forest route");
  formData.set("description", "A ride through forest roads");
  formData.set("startAt", "2099-08-16T08:00:00.000Z");
  formData.set("startLocationName", "Park");
  formData.set("startLat", "55.755864");
  formData.set("startLng", "37.617698");
  formData.set("distanceKm", "42");
  formData.set("paceMin", "18");
  formData.set("paceMax", "22");
  formData.set("difficulty", "medium");
  formData.set("bikeType", "gravel");
  formData.set("asphaltPercent", "70");
  formData.set("unpavedPercent", "30");
  formData.append("unpavedSurfaceDetails", "hardpack");
  formData.append("unpavedSurfaceDetails", "gravel");
  formData.set("dropPolicy", "no_drop");
  formData.set("routeDescription", "Loop route");
  formData.set("equipmentRequirements", "Helmet");
  formData.set("rules", "Ride safely");
  formData.set("maxParticipants", "10");
  formData.set("registrationMode", "automatic");
  formData.set("coverImage", "/cover.webp");
  formData.set("organizerId", "organizer-1");
  formData.set("cityId", "city-1");
  return formData;
}
