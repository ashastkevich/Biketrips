"use client";

import { useEffect } from "react";

/**
 * Scrolls to the element with this id when the URL hash points at it. On client-side navigation
 * Next.js handles the hash while the loading skeleton is shown, before the target exists, so
 * links like /trips/slug#participants would otherwise stay at the top of the page.
 */
export function ScrollToHash({ id }: { id: string }) {
  useEffect(() => {
    if (window.location.hash !== `#${id}`) return;
    document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, [id]);

  return null;
}
