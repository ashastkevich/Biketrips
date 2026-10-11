"use client";

import { useState } from "react";

import { savePostAuthReturnTo } from "../auth/post-auth-return";
import { AuthOptionsDialog } from "./auth-options-dialog";
import type { AuthProvider } from "./auth-options";
import { Button } from "./components";

/** Signup requires an account: contacts for the organizer come from the profile. */
export function JoinSignInButton({
  returnTo,
  children,
  className,
}: {
  returnTo: string;
  children: string;
  className?: string;
}) {
  const [showAuth, setShowAuth] = useState(false);

  function startAuthorization(provider: AuthProvider) {
    savePostAuthReturnTo(returnTo);
    window.location.assign(`/auth/${provider}?returnTo=${encodeURIComponent(returnTo)}`);
  }

  return (
    <>
      <Button className={className} size="large" type="button" onClick={() => setShowAuth(true)}>
        {children}
      </Button>
      {showAuth ? (
        <AuthOptionsDialog onClose={() => setShowAuth(false)} onSelect={startAuthorization} />
      ) : null}
    </>
  );
}
