export const SITE_NAME = "BikeTrips";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://biketrips.ru").replace(/\/+$/, "");
export const SITE_HOST = new URL(SITE_URL).host;

export const DEFAULT_DESCRIPTION =
  "Совместные велопоездки и покатушки в Москве и Санкт-Петербурге: найдите компанию для велопрогулки по своему уровню или соберите группу на свой маршрут.";

// Next.js replaces nested openGraph objects instead of merging them, so pages spread this.
export const baseOpenGraph = {
  type: "website",
  siteName: SITE_NAME,
  locale: "ru_RU",
} as const;

export const noIndexMetadata = {
  robots: { index: false, follow: false },
} as const;
