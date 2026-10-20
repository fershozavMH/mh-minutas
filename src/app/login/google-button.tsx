"use client";

import { authClient } from "@/lib/auth-client";

export function GoogleButton() {
  return (
    <button type="button" onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/" })}>
      Entrar con Google
    </button>
  );
}
