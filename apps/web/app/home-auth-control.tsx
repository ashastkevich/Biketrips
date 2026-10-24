"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { AuthProvider } from "./ui/auth-options";
import { AuthOptionsDialog } from "./ui/auth-options-dialog";
import styles from "./home-auth-control.module.css";

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

interface ProfileMenuProps {
  tone?: "light" | "dark";
  isAdmin?: boolean;
}

export function ProfileMenu({ tone = "light", isAdmin = false }: ProfileMenuProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showProfileMenu) return;

    function closeProfileMenu(event: MouseEvent) {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setShowProfileMenu(false);
    }

    document.addEventListener("mousedown", closeProfileMenu);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", closeProfileMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showProfileMenu]);

  async function logout() {
    setLoggingOut(true);
    const response = await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);

    if (response?.ok) {
      window.location.assign("/");
      return;
    }

    setLoggingOut(false);
  }

  return (
    <div className={styles.profileMenu} ref={profileMenuRef}>
      <button
        className={classes(styles.profileTrigger, tone === "dark" && styles.profileTriggerDark)}
        type="button"
        aria-label="Открыть меню профиля"
        aria-haspopup="menu"
        aria-expanded={showProfileMenu}
        onClick={() => setShowProfileMenu((current) => !current)}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="2" />
          <path d="M5.5 20c.7-4 3-6 6.5-6s5.8 2 6.5 6" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
        </svg>
      </button>
      {showProfileMenu ? (
        <div className={styles.dropdown} role="menu">
          <Link href="/profile" role="menuitem" onClick={() => setShowProfileMenu(false)}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="2" />
              <path d="M5.5 20c.7-4 3-6 6.5-6s5.8 2 6.5 6" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
            </svg>
            Профиль
          </Link>
          {isAdmin ? (
            <>
              <Link href="/admin/moderation" role="menuitem" onClick={() => setShowProfileMenu(false)}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 3.5 5 6.5v5c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9v-5l-7-3Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
                  <path d="m9 12 2 2 4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
                Модерация
              </Link>
              <Link href="/admin/imports" role="menuitem" onClick={() => setShowProfileMenu(false)}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  <path d="M5 15v3.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                </svg>
                Импорт
              </Link>
            </>
          ) : null}
          <button type="button" role="menuitem" disabled={loggingOut} onClick={logout}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M10 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H10" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
              <path d="M14 8l4 4-4 4M18 12H9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            {loggingOut ? "Выходим…" : "Выйти"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function HomeAuthControl({
  isAuthorized,
  isAdmin = false,
  tone = "light",
}: {
  isAuthorized: boolean;
  isAdmin?: boolean;
  tone?: "light" | "dark";
}) {
  const router = useRouter();
  const [showAuth, setShowAuth] = useState(false);

  function startAuthorization(provider: AuthProvider) {
    router.push(`/auth/${provider}?returnTo=/`);
  }

  if (isAuthorized) return <ProfileMenu tone={tone} isAdmin={isAdmin} />;

  return (
    <>
      <button
        className={classes(
          styles.loginButton,
          tone === "dark" ? styles.loginButtonDark : styles.loginButtonLight,
        )}
        type="button"
        onClick={() => setShowAuth(true)}
      >
        <span>Войти</span>
      </button>
      {showAuth ? <AuthOptionsDialog onClose={() => setShowAuth(false)} onSelect={startAuthorization} /> : null}
    </>
  );
}
