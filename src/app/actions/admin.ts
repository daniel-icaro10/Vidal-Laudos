"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireGerente, requireUser } from "@/lib/auth";
import { deleteUpload, saveImage } from "@/lib/storage";

type Estado = { ok?: string; error?: string } | undefined;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

// ---------- Usuários ----------
export async function criarUsuario(_: Estado, fd: FormData): Promise<Estado> {
  await requireGerente();
  const name = str(fd, "name");
  const email = str(fd, "email").toLowerCase();
  const senha = str(fd, "senha");
  const role = str(fd, "role") === "GERENTE" ? "GERENTE" : "FUNCIONARIO";
  if (!name || !email || senha.length < 6) return { error: "Preencha nome, e-mail e senha (mín. 6 caracteres)." };
  if (await prisma.user.findUnique({ where: { email } })) return { error: "Já existe um usuário com este e-mail." };
  await prisma.user.create({ data: { name, email, role, passwordHash: await bcrypt.hash(senha, 10) } });
  revalidatePath("/gerente/usuarios");
  return { ok: `Usuário ${name} criado.` };
}

export async function atualizarUsuario(id: string, fd: FormData) {
  const gerente = await requireGerente();
  const name = str(fd, "name");
  const role = str(fd, "role") === "GERENTE" ? "GERENTE" : "FUNCIONARIO";
  const active = fd.get("active") === "on";
  const senha = str(fd, "senha");
  // Evita que o gerente tire o próprio acesso
  const proprio = id === gerente.id;
  await prisma.user.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      role: proprio ? "GERENTE" : role,
      active: proprio ? true : active,
      ...(senha.length >= 6 ? { passwordHash: await bcrypt.hash(senha, 10) } : {}),
    },
  });
  const assinatura = fd.get("assinatura");
  if (assinatura instanceof File && assinatura.size > 0 && assinatura.type.startsWith("image/")) {
    await trocarAssinatura(id, assinatura);
  }
  revalidatePath("/gerente/usuarios");
}

async function trocarAssinatura(userId: string, file: File) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const rel = await saveImage("assinaturas", file, { png: true });
  await prisma.user.update({ where: { id: userId }, data: { signaturePath: rel } });
  await deleteUpload(user.signaturePath);
}

// ---------- Perfil ----------
export async function atualizarPerfil(_: Estado, fd: FormData): Promise<Estado> {
  const user = await requireUser();
  const atual = str(fd, "atual");
  const nova = str(fd, "nova");
  if (nova) {
    if (nova.length < 6) return { error: "A nova senha precisa ter pelo menos 6 caracteres." };
    const db = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!(await bcrypt.compare(atual, db.passwordHash))) return { error: "Senha atual incorreta." };
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(nova, 10) } });
  }
  const assinatura = fd.get("assinatura");
  if (assinatura instanceof File && assinatura.size > 0) {
    if (!assinatura.type.startsWith("image/")) return { error: "A assinatura deve ser uma imagem." };
    await trocarAssinatura(user.id, assinatura);
  }
  revalidatePath("/perfil");
  return { ok: "Perfil atualizado." };
}

export async function removerAssinatura() {
  const user = await requireUser();
  await prisma.user.update({ where: { id: user.id }, data: { signaturePath: null } });
  await deleteUpload(user.signaturePath);
  revalidatePath("/perfil");
}

// ---------- Listas ----------
export async function salvarTermo(id: string | null, fd: FormData) {
  await requireGerente();
  const data = { numero: Number(str(fd, "numero")) || 0, pt: str(fd, "pt"), en: str(fd, "en"), ativo: id ? fd.get("ativo") === "on" : true };
  if (!data.pt) return;
  if (id) await prisma.danoTermo.update({ where: { id }, data });
  else await prisma.danoTermo.create({ data });
  revalidatePath("/gerente/listas");
}

export async function salvarItemEmbalagem(id: string | null, fd: FormData) {
  await requireGerente();
  const data = {
    pt: str(fd, "pt"),
    en: str(fd, "en"),
    grupo: str(fd, "grupo") === "2" ? 2 : 1,
    ordem: Number(str(fd, "ordem")) || 0,
    ativo: id ? fd.get("ativo") === "on" : true,
  };
  if (!data.pt) return;
  if (id) await prisma.embalagemItem.update({ where: { id }, data });
  else await prisma.embalagemItem.create({ data });
  revalidatePath("/gerente/listas");
}
