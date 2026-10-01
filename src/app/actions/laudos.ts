"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getLaudoOr404, podeEditar } from "@/lib/laudos";
import { deleteFolder, deleteUpload } from "@/lib/storage";

export async function criarLaudo() {
  const user = await requireUser();
  const laudo = await prisma.laudo.create({
    data: {
      authorId: user.id,
      examinador: user.name,
      local: "São Paulo",
      dataExame: new Date().toISOString().slice(0, 10),
    },
  });
  redirect(`/laudos/${laudo.id}`);
}

const LaudoSchema = z.object({
  artista: z.string(),
  titulo: z.string(),
  dataObra: z.string(),
  material: z.string(),
  dimensoes: z.string(),
  colecao: z.string(),
  exposicao: z.string(),
  estado: z.enum(["", "GOOD", "FAIR", "SEVERE"]),
  comentarios: z.string(),
  local: z.string(),
  dataExame: z.string(),
  examinador: z.string(),
  embalagemOutros: z.string(),
  danos: z.array(z.string()),
  embalagens: z.array(z.string()),
  fotos: z.array(z.object({ id: z.string(), legenda: z.string(), ordem: z.number() })),
});

export type LaudoInput = z.infer<typeof LaudoSchema>;

export async function salvarLaudo(id: string, input: LaudoInput) {
  const user = await requireUser();
  const laudo = await getLaudoOr404(id, user);
  if (!podeEditar(laudo, user)) return { ok: false, error: "Laudo finalizado não pode ser editado." };

  const { danos, embalagens, fotos, ...campos } = LaudoSchema.parse(input);
  const fotoIds = new Set(laudo.fotos.map((f) => f.id));

  await prisma.$transaction([
    prisma.laudo.update({ where: { id }, data: campos }),
    prisma.laudoDano.deleteMany({ where: { laudoId: id } }),
    prisma.laudoDano.createMany({ data: danos.map((termoId) => ({ laudoId: id, termoId })) }),
    prisma.laudoEmbalagem.deleteMany({ where: { laudoId: id } }),
    prisma.laudoEmbalagem.createMany({ data: embalagens.map((itemId) => ({ laudoId: id, itemId })) }),
    ...fotos
      .filter((f) => fotoIds.has(f.id))
      .map((f) => prisma.foto.update({ where: { id: f.id }, data: { legenda: f.legenda, ordem: f.ordem } })),
  ]);
  return { ok: true, savedAt: new Date().toISOString() };
}

export async function removerFoto(laudoId: string, fotoId: string) {
  const user = await requireUser();
  const laudo = await getLaudoOr404(laudoId, user);
  if (!podeEditar(laudo, user)) return;
  const foto = laudo.fotos.find((f) => f.id === fotoId);
  if (!foto) return;
  await prisma.foto.delete({ where: { id: fotoId } });
  await deleteUpload(foto.path);
}

const SLOTS = ["fotoPrincipal", "fotoFrente", "fotoVerso", "fotoDanos"] as const;
export type Slot = (typeof SLOTS)[number];

export async function removerFotoFixa(laudoId: string, slot: Slot) {
  const user = await requireUser();
  const laudo = await getLaudoOr404(laudoId, user);
  if (!podeEditar(laudo, user) || !SLOTS.includes(slot)) return;
  await prisma.laudo.update({ where: { id: laudoId }, data: { [slot]: null } });
  await deleteUpload(laudo[slot]);
}

export async function finalizarLaudo(id: string) {
  const user = await requireUser();
  const laudo = await getLaudoOr404(id, user);
  if (!podeEditar(laudo, user)) return;
  await prisma.laudo.update({ where: { id }, data: { status: "FINALIZADO" } });
  revalidatePath(`/laudos/${id}`);
}

export async function reabrirLaudo(id: string) {
  const user = await requireUser();
  if (user.role !== "GERENTE") return;
  await getLaudoOr404(id, user);
  await prisma.laudo.update({ where: { id }, data: { status: "RASCUNHO" } });
  revalidatePath(`/laudos/${id}`);
}

export async function excluirLaudo(id: string) {
  const user = await requireUser();
  const laudo = await getLaudoOr404(id, user);
  if (!podeEditar(laudo, user)) return;
  await prisma.laudo.delete({ where: { id } });
  await deleteFolder(id);
  redirect("/laudos");
}
