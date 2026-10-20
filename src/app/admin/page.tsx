import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/current-user";
import { getDb } from "@/lib/db";
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

  return (
    <>
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Correo</th>
            <th>Perfil</th>
            <th>Nivel máximo</th>
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
      <Suspense fallback={<p>Cargando…</p>}>
        <Admin />
      </Suspense>
    </main>
  );
}
