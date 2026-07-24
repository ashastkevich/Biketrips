"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "./ui/components";
import styles from "./cookie-notice.module.css";

const cookieNoticeStorageKey = "biketrips:cookie-notice-accepted:v1";
const cookieNoticeCookieName = "biketrips_cookie_notice";

export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(cookieNoticeStorageKey) !== "accepted");
    } catch {
      setVisible(true);
    }
  }, []);

  function acceptNotice() {
    try {
      window.localStorage.setItem(cookieNoticeStorageKey, "accepted");
      document.cookie = `${cookieNoticeCookieName}=accepted; path=/; max-age=31536000; samesite=lax`;
    } finally {
      setVisible(false);
    }
  }

  if (!visible) {
    return null;
  }

  return (
    <aside className={styles.notice} aria-label="Уведомление о cookies">
      <div className={styles.inner}>
        <p>
          BikeTrips использует cookies и локальное хранилище для входа, выбранного города,
          черновиков форм и стабильной работы сайта. Подробнее:{" "}
          <Link href="/legal/cookies">Cookies и аналитика</Link>.
        </p>
        <Button className={styles.action} size="small" type="button" onClick={acceptNotice}>
          Понятно
        </Button>
      </div>
    </aside>
  );
}
