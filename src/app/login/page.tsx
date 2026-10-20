"use client";

import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  return (
    <main>
      <h1>Entrar a MH Executive OS</h1>
      <p>Usa tu cuenta de Google de Machinery Hunters.</p>
      <button
        type="button"
        onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/" })}
      >
        Entrar con Google
      </button>
    </main>
  );
}
