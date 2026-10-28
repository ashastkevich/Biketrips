export const SITE_NAME = "BikeTrips";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://biketrips.ru").replace(/\/+$/, "");
export const SITE_HOST = new URL(SITE_URL).host;

export const DEFAULT_DESCRIPTION =
  "Совместные велопоездки и покатушки в Москве и Санкт-Петербурге: найдите компанию для велопрогулки по своему уровню или соберите группу на свой маршрут.";

export interface SocialImage {
  url: string;
  width?: number;
  height?: number;
  alt: string;
}

export const defaultSocialImage: SocialImage = {
  url: "/img/og-default.jpg",
  width: 1200,
  height: 630,
  alt: "Совместные велопоездки на BikeTrips",
};

const uploadedCoverPattern = /^\/api\/trips\/[^/?]+\/cover-image(?:\?|$)/;

/**
 * Uploaded covers are WebP, which not every link preview renders, so previews use the JPEG copy
 * the API serves on ?format=jpeg. Anything else falls back to the site-wide image.
 */
export function getSocialImage(coverImage: string | null | undefined, alt: string): SocialImage {
  if (!coverImage || !uploadedCoverPattern.test(coverImage)) return defaultSocialImage;

  return { url: `${coverImage}${coverImage.includes("?") ? "&" : "?"}format=jpeg`, alt };
}

// Next.js replaces nested openGraph objects instead of merging them, so pages spread this.
export const baseOpenGraph = {
  type: "website",
  siteName: SITE_NAME,
  locale: "ru_RU",
  images: defaultSocialImage,
} as const;

export const baseTwitter = { card: "summary_large_image" } as const;

export const noIndexMetadata = {
  robots: { index: false, follow: false },
} as const;
