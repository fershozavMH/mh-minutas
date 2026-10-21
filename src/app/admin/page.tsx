import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import { HelpTip } from "../help-tip";
import { SignOutButton } from "../sign-out-button";
import { UserForm } from "./user-form";

async function Admin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.profile !== "ADMIN") redirect("/");

  const db = getDb();
  const [users, levels] = await Promise.all([
    db.user.findMany({ orderBy: { name: "asc" }, include: { maxLevel: true, boss: true } }),
    db.level.findMany({ where: { active: true }, orderBy: { rank: "asc" } }),
  ]);
  const directors = users.filter((u) => u.profile === "DIRECTOR" && u.active);
  const hasAssistants = users.some((u) => u.profile === "ASSISTANT");
  // Un solo siguiente paso a la vez, para no saturar la pantalla.
  const nextStep =
    directors.length === 0
      ? "Siguiente paso: da de alta a los directivos (Justin, Yuri y Gabriel)."
      : !hasAssistants
        ? "Siguiente paso: da de alta a las asistentes; cada una necesita un directivo."
        : null;

  return (
    <>
      {nextStep && <p className="hint">{nextStep}</p>}
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Correo</th>
            <th>Perfil</th>
            <th>
              Nivel máximo <HelpTip topic="maxLevel" label="Nivel máximo" />
            </th>
            <th>Directivo</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.profile}</td>
              <td>{u.maxLevel.name}</td>
              <td>{u.boss?.name ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <UserForm
        levels={levels.map((l) => ({ id: l.id, name: l.name }))}
        directors={directors.map((d) => ({ id: d.id, name: d.name }))}
      />
    </>
  );
}

export default function AdminPage() {
  return (
    <main>
      <h1>Usuarios</h1>
      <p>
        <Link href="/admin/catalogos">Niveles y estados</Link> · <Link href="/">Inicio</Link> <SignOutButton />
      </p>
      <Suspense fallback={<p>Cargando…</p>}>
        <Admin />
      </Suspense>
    </main>
  );
}
