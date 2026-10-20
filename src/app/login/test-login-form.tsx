"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

// Solo se muestra en local, con ENABLE_TEST_LOGIN=true.
export function TestLoginForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const { error } = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    if (error) {
      setMessage("Correo o contraseña incorrectos.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={submit}>
      <h2>Entrada de prueba (solo local)</h2>
      <div className="field">
        <label>
          Correo <input name="email" type="email" required autoComplete="username" />
        </label>
      </div>
      <div className="field">
        <label>
          Contraseña <input name="password" type="password" required autoComplete="current-password" />
        </label>
      </div>
      <button type="submit">Entrar</button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
