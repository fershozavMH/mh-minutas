import { headers } from "next/headers";
import { getAuth } from "./auth";
import { getDb } from "./db";

// La persona con sesión y activa en la base, o null.
export async function getCurrentUser() {
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) return null;

  const user = await getDb().user.findUnique({
    where: { id: session.user.id },
    include: { maxLevel: true },
  });
  return user && user.active ? user : null;
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireAdmin(): Promise<CurrentUser | Response> {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "sin_sesion" }, { status: 401 });
  if (user.profile !== "ADMIN") return Response.json({ error: "sin_permiso" }, { status: 403 });
  return user;
}
