"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AuthOptions, type AuthProvider } from "./ui/auth-options";

export function HomeAuthControl({ isAuthorized }: { isAuthorized: boolean }) {
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    if (!showAuth) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setShowAuth(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [showAuth]);

  function startAuthorization(provider: AuthProvider) {
    window.location.assign(`/auth/${provider}?returnTo=/`);
  }

  if (isAuthorized) {
    return (
      <Link className="create-button" href="/organizer/trips">
        Профиль
      </Link>
    );
  }

  return (
    <>
      <button className="create-button" type="button" onClick={() => setShowAuth(true)}>
        Войти
      </button>
      {showAuth ? (
        <div
          className="ui-dialog-backdrop auth-options-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-options-title"
          onMouseDown={() => setShowAuth(false)}
        >
          <div onMouseDown={(event) => event.stopPropagation()}>
            <AuthOptions
              onClose={() => setShowAuth(false)}
              onSelect={startAuthorization}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
