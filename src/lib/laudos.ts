import "server-only";
import { notFound } from "next/navigation";
import { prisma } from "./db";
import type { CurrentUser } from "./auth";

/** Carrega o laudo verificando permissão: gerente vê todos, funcionário só os próprios. */
export async function getLaudoOr404(id: string, user: CurrentUser) {
  const laudo = await prisma.laudo.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, signaturePath: true } },
      fotos: { orderBy: { ordem: "asc" } },
      danos: true,
      embalagens: true,
    },
  });
  if (!laudo) notFound();
  if (user.role !== "GERENTE" && laudo.authorId !== user.id) notFound();
  return laudo;
}

export type LaudoCompleto = Awaited<ReturnType<typeof getLaudoOr404>>;

export function podeEditar(laudo: { status: string; authorId: string }, user: CurrentUser) {
  if (user.role === "GERENTE") return true;
  return laudo.authorId === user.id && laudo.status === "RASCUNHO";
}

export const nomeLaudo = (l: { artista: string; titulo: string }) =>
  [l.artista, l.titulo].filter(Boolean).join(" - ") || "Laudo sem título";
