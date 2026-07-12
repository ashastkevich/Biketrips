const fallbackTripBackground = "linear-gradient(135deg, #53613c, #273525)";

export function getTripCoverBackground(coverImage: string | null | undefined): string {
  return coverImage
    ? `url("${coverImage}")`
    : fallbackTripBackground;
}

export function getTripCardCoverBackground(coverImage: string | null | undefined): string {
  return coverImage
    ? `linear-gradient(180deg, transparent, rgba(5, 18, 11, 0.52)), url("${coverImage}")`
    : fallbackTripBackground;
}
