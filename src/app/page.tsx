import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getAuth } from "@/lib/auth";

async function Greeting() {
  // Primero se leen los encabezados: así la página se arma al pedirla, no en el build.
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) redirect("/login");

  return <p>Hola, {session.user.name}.</p>;
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
