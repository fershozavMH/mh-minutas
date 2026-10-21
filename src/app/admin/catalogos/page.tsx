import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import { SignOutButton } from "../../sign-out-button";
import { CatalogManager } from "./catalog-manager";

async function Catalogs() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.profile !== "ADMIN") redirect("/");

  const db = getDb();
  const [levels, statuses] = await Promise.all([
    db.level.findMany({ orderBy: { rank: "asc" } }),
    db.actionStatus.findMany({ orderBy: [{ position: "asc" }, { createdAt: "asc" }] }),
  ]);
  return <CatalogManager levels={levels} statuses={statuses} />;
}

export default function CatalogsPage() {
  return (
    <main>
      <h1>Niveles y estados</h1>
      <p>
        <Link href="/admin">Usuarios</Link> · <Link href="/">Inicio</Link> <SignOutButton />
      </p>
      <p className="hint">Nada se borra: lo que ya no se use se desactiva y el historial se conserva.</p>
      <Suspense fallback={<p>Cargando…</p>}>
        <Catalogs />
      </Suspense>
    </main>
  );
}
