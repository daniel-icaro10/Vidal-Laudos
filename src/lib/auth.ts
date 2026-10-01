import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { SESSION_COOKIE, verifySession } from "./session";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: "GERENTE" | "FUNCIONARIO";
  signaturePath: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user || !user.active) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as CurrentUser["role"],
    signaturePath: user.signaturePath,
  };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireGerente() {
  const user = await requireUser();
  if (user.role !== "GERENTE") redirect("/laudos");
  return user;
}

export const isGerente = (u: CurrentUser) => u.role === "GERENTE";
