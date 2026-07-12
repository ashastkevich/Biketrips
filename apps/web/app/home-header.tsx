"use client";

import { useEffect, useState } from "react";

import { HomeAuthControl } from "./home-auth-control";
import { Brand } from "./lib/components";
import shellStyles from "./lib/app-shell.module.css";

export function HomeHeader({ isAuthorized }: { isAuthorized: boolean }) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    function updateHeaderState() {
      const hero = document.querySelector<HTMLElement>("[data-home-hero]");
      const header = document.querySelector<HTMLElement>("[data-home-header]");
      const heroBottom = hero?.getBoundingClientRect().bottom ?? 0;
      const headerHeight = header?.offsetHeight ?? 96;

      setIsScrolled(heroBottom <= headerHeight + 8);
    }

    updateHeaderState();
    window.addEventListener("scroll", updateHeaderState, { passive: true });
    window.addEventListener("resize", updateHeaderState);
    return () => {
      window.removeEventListener("scroll", updateHeaderState);
      window.removeEventListener("resize", updateHeaderState);
    };
  }, []);

  return (
    <header
      className={`${shellStyles.header} ${shellStyles.homeHeader}${isScrolled ? ` ${shellStyles.homeHeaderScrolled}` : ""}`}
      data-home-header
    >
      <div
        className={`page ${shellStyles.inner} ${shellStyles.homeInner}${isScrolled ? ` ${shellStyles.elevatedInner} ${shellStyles.homeInnerScrolled}` : ""}`}
      >
        <Brand tone="light" href="#hero" scrolled={isScrolled} />
        <nav className={shellStyles.nav} aria-label="Навигация">
          <a
            className={`${shellStyles.navLink}${isScrolled ? "" : ` ${shellStyles.homeNavLink}`}`}
            href="#how"
          >
            Как это работает
          </a>
          <HomeAuthControl isAuthorized={isAuthorized} tone={isScrolled ? "dark" : "light"} />
        </nav>
      </div>
    </header>
  );
}
