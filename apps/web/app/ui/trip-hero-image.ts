import { getImageProps } from "next/image";
import { preload } from "react-dom";

export const tripHeroImageSizes = "(max-width: 760px) 100vw, 1040px";

/**
 * Starts downloading the trip card hero before the modal opens (hover, focus or press on a feed
 * card), so the large cover is usually ready by the time it is shown.
 */
export function preloadTripHeroImage(coverImage: string | undefined): void {
  if (!coverImage) return;

  const { props } = getImageProps({ src: coverImage, alt: "", fill: true, sizes: tripHeroImageSizes });
  preload(props.src, {
    as: "image",
    imageSrcSet: props.srcSet,
    imageSizes: props.sizes,
    fetchPriority: "high",
  });
}
