"use client";

import { useEffect, useState } from "react";

import { HomeAuthControl } from "./home-auth-control";
import { Brand } from "./lib/components";

export function HomeHeader({ isAuthorized }: { isAuthorized: boolean }) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    function updateHeaderState() {
      const hero = document.querySelector<HTMLElement>(".hero");
      const header = document.querySelector<HTMLElement>(".site-header--home");
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
    <header className={`site-header site-header--home${isScrolled ? " site-header--scrolled" : ""}`}>
      <div className="page site-header__inner">
        <Brand tone="light" href="#hero" />
        <nav className="site-nav" aria-label="Навигация">
          <a className="site-nav__link" href="#how">
            Как это работает
          </a>
          <HomeAuthControl isAuthorized={isAuthorized} tone={isScrolled ? "dark" : "light"} />
        </nav>
      </div>
    </header>
  );
}
