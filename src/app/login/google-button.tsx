"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function GoogleButton() {
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    try {
      await authClient.signIn.social({ provider: "google", callbackURL: "/" });
    } catch {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={signIn} disabled={busy} aria-busy={busy}>
      {busy ? "Abriendo Google…" : "Entrar con Google"}
    </button>
  );
}
