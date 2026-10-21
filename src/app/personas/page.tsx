import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/current-user";
import { listPeople } from "@/lib/data/people";
import { HelpTip } from "../help-tip";
import { SignOutButton } from "../sign-out-button";
import { PeopleManager } from "./people-manager";

async function People() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const people = await listPeople({ includeInactive: true });
  const canManage = user.profile === "ASSISTANT" || user.profile === "ADMIN";

  return (
    <>
      {people.length === 0 && (
        <p className="hint">
          {canManage
            ? "Siguiente paso: agrega a las personas que pueden ser responsables de una acción."
            : "Aún no hay personas registradas."}
        </p>
      )}
      <PeopleManager
        rows={people.map((p) => ({ id: p.id, name: p.name, email: p.email ?? "", active: p.active }))}
        canManage={canManage}
      />
    </>
  );
}

export default function PeoplePage() {
  return (
    <main>
      <h1>
        Personas <HelpTip topic="people" label="Registro de personas" />
      </h1>
      <p>
        <Link href="/">Inicio</Link> <SignOutButton />
      </p>
      <Suspense fallback={<p>Cargando…</p>}>
        <People />
      </Suspense>
    </main>
  );
}
