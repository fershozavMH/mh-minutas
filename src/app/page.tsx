import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/current-user";
import { SignOutButton } from "./sign-out-button";

async function Greeting() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <>
      <p>Hola, {user.name}.</p>
      {user.profile === "ADMIN" && (
        <p>
          <Link href="/admin">Usuarios</Link>
        </p>
      )}
      <SignOutButton />
    </>
  );
}

export default function Home() {
  return (
    <main>
      <h1>MH Executive OS</h1>
      <Suspense fallback={<p>Cargando…</p>}>
        <Greeting />
      </Suspense>
    </main>
  );
}
