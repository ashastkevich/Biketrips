import type { City } from "@biketrips/domain";

export const CITY_COOKIE_NAME = "biketrips_city";
export const DEFAULT_CITY_SLUG = "moscow";

export const fallbackCities: City[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    name: "Москва",
    slug: "moscow",
    timezone: "Europe/Moscow",
    centerLat: 55.755864,
    centerLng: 37.617698,
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    name: "Санкт-Петербург",
    slug: "saint-petersburg",
    timezone: "Europe/Moscow",
    centerLat: 59.939095,
    centerLng: 30.315868,
  },
];

export function selectCity(cities: City[], requestedSlug?: string): City {
  return cities.find((city) => city.slug === requestedSlug)
    ?? cities.find((city) => city.slug === DEFAULT_CITY_SLUG)
    ?? cities[0]
    ?? fallbackCities[0]!;
}
